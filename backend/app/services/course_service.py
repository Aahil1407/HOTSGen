"""Course service handling course domain business rules and validation."""

import logging
from typing import List
from app.models.course import CourseCreate, CourseInDB, CourseUpdate
from app.repositories.course_repository import CourseRepository
from app.repositories.material_repository import MaterialRepository
from app.repositories.extracted_content_repository import ExtractedContentRepository
from app.repositories.syllabus_alignment_repository import SyllabusAlignmentRepository
from app.repositories.chunk_repository import ChunkRepository
from app.repositories.teaching_question_repository import TeachingQuestionRepository
from app.repositories.generated_question_repository import GeneratedQuestionRepository
from app.services.storage_service import StorageService

logger = logging.getLogger(__name__)


class CourseServiceError(Exception):
    """Base exception for course service operations."""
    pass


class CourseAlreadyExistsError(CourseServiceError):
    """Raised when attempting to create a course with a code that already exists."""
    pass


class CourseNotFoundError(CourseServiceError):
    """Raised when the requested course does not exist."""
    pass


class DatabaseUnavailableError(CourseServiceError):
    """Raised when the database service is unavailable or disconnected."""
    pass


class CourseService:
    """Service layer orchestrating course business logic."""

    @staticmethod
    def create_course(course_in: CourseCreate) -> CourseInDB:
        """
        Validate and create a new course.
        Normalizes course_code and ensures uniqueness.
        """
        from app.repositories.course_repository import DatabaseConnectionError

        normalized_code = course_in.course_code.strip().upper()

        # Check for duplicate
        try:
            existing = CourseRepository.get_course(normalized_code)
        except DatabaseConnectionError as e:
            raise DatabaseUnavailableError(f"Database unavailable: {e}")

        if existing:
            raise CourseAlreadyExistsError(f"Course with code '{normalized_code}' already exists.")

        try:
            created = CourseRepository.create_course(course_in)
        except DatabaseConnectionError as e:
            raise DatabaseUnavailableError(f"Database unavailable: {e}")

        if not created:
            # Check if creation returned None due to DuplicateKeyError race condition
            try:
                existing = CourseRepository.get_course(normalized_code)
            except DatabaseConnectionError as e:
                raise DatabaseUnavailableError(f"Database unavailable: {e}")

            if existing:
                raise CourseAlreadyExistsError(f"Course with code '{normalized_code}' already exists.")
            raise CourseServiceError(f"Could not create course '{normalized_code}'.")

        logger.info(f"Course '{normalized_code}' created successfully.")
        return created

    @staticmethod
    def get_course(course_code: str) -> CourseInDB:
        """
        Retrieve a course by its normalized course code.
        Raises CourseNotFoundError if not found.
        """
        from app.repositories.course_repository import DatabaseConnectionError

        normalized_code = course_code.strip().upper()
        try:
            course = CourseRepository.get_course(normalized_code)
        except DatabaseConnectionError as e:
            raise DatabaseUnavailableError(f"Database unavailable: {e}")

        if not course:
            raise CourseNotFoundError(f"Course with code '{normalized_code}' not found.")
        return course

    @staticmethod
    def list_courses(skip: int = 0, limit: int = 100) -> List[CourseInDB]:
        """
        List all available courses with pagination.
        """
        from app.repositories.course_repository import DatabaseConnectionError

        try:
            return CourseRepository.list_courses(skip=skip, limit=limit)
        except DatabaseConnectionError as e:
            raise DatabaseUnavailableError(f"Database unavailable: {e}")

    @staticmethod
    def update_course(course_code: str, course_update: CourseUpdate) -> CourseInDB:
        """
        Update course metadata (course_name, description).
        Disallows altering course_code.
        """
        from app.repositories.course_repository import DatabaseConnectionError

        normalized_code = course_code.strip().upper()
        try:
            existing = CourseRepository.get_course(normalized_code)
        except DatabaseConnectionError as e:
            raise DatabaseUnavailableError(f"Database unavailable: {e}")

        if not existing:
            raise CourseNotFoundError(f"Course with code '{normalized_code}' not found.")

        try:
            updated = CourseRepository.update_course(normalized_code, course_update)
        except DatabaseConnectionError as e:
            raise DatabaseUnavailableError(f"Database unavailable: {e}")

        if not updated:
            raise CourseNotFoundError(f"Course with code '{normalized_code}' not found.")

        logger.info(f"Course '{normalized_code}' updated successfully.")
        return updated

    @staticmethod
    def delete_course(course_code: str) -> bool:
        """
        Delete a course and its associated materials and derived data.
        """
        from app.repositories.course_repository import DatabaseConnectionError

        normalized_code = course_code.strip().upper()
        try:
            existing = CourseRepository.get_course(normalized_code)
        except DatabaseConnectionError as e:
            raise DatabaseUnavailableError(f"Database unavailable: {e}")

        if not existing:
            raise CourseNotFoundError(f"Course with code '{normalized_code}' not found.")

        materials = MaterialRepository.list_materials_by_course(normalized_code)

        # Remove material-derived records before deleting source material metadata.
        for material in materials:
            material_id = material.id
            ExtractedContentRepository.delete_content_by_material(material_id)
            SyllabusAlignmentRepository.delete_alignments_by_material(material_id)
            ChunkRepository.delete_chunks_by_material(material_id)
            TeachingQuestionRepository.delete_questions_by_material(material_id)
            if material.storage_path and not StorageService.delete_file(material.storage_path):
                raise CourseServiceError(
                    f"Could not delete stored file for material '{material_id}' in course '{normalized_code}'."
                )
            if not MaterialRepository.delete_material(material_id):
                raise CourseServiceError(
                    f"Could not fully delete material '{material_id}' for course '{normalized_code}'."
                )

        # Also clear any course-owned records not linked to a material.
        ChunkRepository.delete_chunks_by_course(normalized_code)
        TeachingQuestionRepository.delete_questions_by_course(normalized_code)
        GeneratedQuestionRepository.delete_generated_questions_by_course(normalized_code)

        try:
            success = CourseRepository.delete_course(normalized_code)
        except DatabaseConnectionError as e:
            raise DatabaseUnavailableError(f"Database unavailable: {e}")

        if not success:
            raise CourseNotFoundError(f"Failed to delete course '{normalized_code}'.")

        logger.info(f"Course '{normalized_code}' deleted successfully.")
        return True

