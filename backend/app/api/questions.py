"""Public student endpoints for grounded HOTS question generation and history."""

import logging
from typing import List

from fastapi import APIRouter, HTTPException, Query, status

from app.core.embeddings import EmbeddingModelError
from app.models.generated_question import (
    GeneratedQuestionInDB,
    QuestionGenerationRequest,
    QuestionGenerationResponse,
)
from app.models.course import CoursePublicResponse
from app.repositories.chunk_repository import AtlasVectorSearchUnavailableError
from app.repositories.chunk_repository import ChunkRepository
from app.repositories.course_repository import CourseRepository, DatabaseConnectionError
from app.repositories.generated_question_repository import GeneratedQuestionRepository
from app.services.course_service import CourseNotFoundError
from app.services.question_generation_service import (
    EmptyRetrievalContextError,
    GeminiNotConfiguredError,
    GeminiProviderError,
    InvalidGeneratedOutputError,
    QuestionGenerationError,
    QuestionGenerationService,
    QuestionPersistenceError,
)

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/courses", response_model=List[CoursePublicResponse], summary="List courses ready for question generation")
def list_generation_courses() -> List[CoursePublicResponse]:
    """Only expose courses with at least one stored in-syllabus embedding."""
    try:
        courses = [CourseRepository.get_course(code) for code in ChunkRepository.list_course_codes_with_embeddings()]
        return [
            CoursePublicResponse(
                course_code=course.course_code,
                course_name=course.course_name,
                description=course.description,
                units=course.units,
            )
            for course in courses if course
        ]
    except Exception as exc:
        logger.exception("Could not list courses ready for generation")
        raise HTTPException(status_code=503, detail="Generation-ready course list is temporarily unavailable.") from exc


@router.get("", response_model=List[GeneratedQuestionInDB], summary="List generated questions for a course")
def list_generated_questions(
    course_code: str = Query(..., min_length=2, max_length=20),
    limit: int = Query(default=50, ge=1, le=200),
) -> List[GeneratedQuestionInDB]:
    """Return previously generated questions without triggering generation."""
    try:
        return GeneratedQuestionRepository.get_generated_questions_by_course(course_code, limit=limit)
    except Exception as exc:
        logger.exception("Could not fetch generated question history for %s", course_code)
        raise HTTPException(status_code=503, detail="Generated question history is temporarily unavailable.") from exc


@router.post("/generate", response_model=QuestionGenerationResponse, status_code=status.HTTP_200_OK, summary="Generate grounded HOTS questions")
def generate_questions(request: QuestionGenerationRequest) -> QuestionGenerationResponse:
    """Retrieve course-scoped Atlas context, generate, validate, and save questions."""
    try:
        return QuestionGenerationService.generate(request)
    except CourseNotFoundError as exc:
        raise HTTPException(status_code=404, detail={"code": "course_not_found", "message": str(exc)}) from exc
    except DatabaseConnectionError as exc:
        raise HTTPException(status_code=503, detail={"code": "database_unavailable", "message": "The course database is temporarily unavailable."}) from exc
    except EmptyRetrievalContextError as exc:
        raise HTTPException(status_code=422, detail={"code": "empty_context", "message": str(exc)}) from exc
    except GeminiNotConfiguredError as exc:
        raise HTTPException(status_code=503, detail={"code": "gemini_not_configured", "message": str(exc)}) from exc
    except AtlasVectorSearchUnavailableError as exc:
        raise HTTPException(status_code=503, detail={"code": "vector_index_unavailable", "message": str(exc)}) from exc
    except EmbeddingModelError as exc:
        raise HTTPException(status_code=503, detail={"code": "embedding_model_unavailable", "message": str(exc)}) from exc
    except GeminiProviderError as exc:
        raise HTTPException(status_code=502, detail={"code": "gemini_error", "message": str(exc)}) from exc
    except InvalidGeneratedOutputError as exc:
        raise HTTPException(status_code=502, detail={"code": "invalid_model_output", "message": str(exc)}) from exc
    except QuestionPersistenceError as exc:
        raise HTTPException(status_code=503, detail={"code": "save_failed", "message": str(exc)}) from exc
    except QuestionGenerationError as exc:
        raise HTTPException(status_code=422, detail={"code": "invalid_selection", "message": str(exc)}) from exc
    except Exception as exc:
        logger.exception("Unexpected failure during question generation")
        raise HTTPException(
            status_code=500,
            detail={"code": "generation_failed", "message": "Question generation failed unexpectedly. Please retry."},
        ) from exc
