"""Focused tests for retrieval-grounded question generation and validation."""

import unittest
from unittest.mock import MagicMock, patch

from app.models.course import CourseInDB, Topic, Unit
from app.models.embedding import VectorSearchResponse, VectorSearchResult, VectorSearchTarget
from app.models.generated_question import GeneratedQuestionInDB, QuestionGenerationRequest
from app.repositories.chunk_repository import AtlasVectorSearchUnavailableError, ChunkRepository
from app.services.question_generation_service import (
    EmptyRetrievalContextError,
    InvalidGeneratedOutputError,
    QuestionGenerationService,
)


class QuestionGenerationServiceTests(unittest.TestCase):
    def setUp(self):
        self.course = CourseInDB(
            course_code="BACSE202",
            course_name="Database Systems",
            units=[Unit(id="BACSE202_U3", unit_number=3, unit_name="Transaction Processing", topics=[
                Topic(id="BACSE202_U3_T1", topic_name="Concurrency Control")
            ])],
        )
        self.context = VectorSearchResponse(
            query="database transaction",
            target=VectorSearchTarget.COURSE_CONTENT,
            course_code="BACSE202",
            total_results=1,
            results=[VectorSearchResult(
                id="chunk-12345678",
                text="Two-phase locking coordinates concurrent transactions and guarantees conflict serializability.",
                score=0.91,
                course_code="BACSE202",
                unit_id="BACSE202_U3",
                topic_id="BACSE202_U3_T1",
                source_material_id="material-1",
                page_number=14,
            )],
        )
        self.request = QuestionGenerationRequest(
            course_code="BACSE202",
            unit_id="BACSE202_U3",
            topic_id="BACSE202_U3_T1",
            count=1,
        )
        self.valid_output = {"questions": [{
            "question_text": "A banking system uses two-phase locking and experiences a deadlock. Analyze how the schedule can be recovered while preserving serializability.",
            "answer": "Abort one transaction, release its locks, and restart it after the other transaction completes.",
            "explanation": "Two-phase locking guarantees conflict serializability, while aborting and restarting a transaction can resolve deadlock.",
            "question_type": "case scenario",
            "source_chunk_ids": ["chunk-12345678"],
        }]}

    @patch("app.repositories.chunk_repository.get_chunks_collection")
    def test_atlas_vector_search_failure_does_not_fall_back(self, get_collection):
        collection = MagicMock()
        collection.list_search_indexes.return_value = [{"name": "vector_index"}]
        collection.aggregate.side_effect = RuntimeError("search index not found")
        get_collection.return_value = collection

        with self.assertRaises(AtlasVectorSearchUnavailableError):
            ChunkRepository.vector_search_chunks(
                query_vector=[0.1] * 384,
                course_code="BACSE202",
                require_atlas=True,
            )
        collection.find.assert_not_called()

    @patch("app.repositories.chunk_repository.get_chunks_collection")
    def test_missing_atlas_vector_index_is_reported_before_search(self, get_collection):
        collection = MagicMock()
        collection.list_search_indexes.return_value = []
        get_collection.return_value = collection

        with self.assertRaisesRegex(AtlasVectorSearchUnavailableError, "vector_index.*missing"):
            ChunkRepository.vector_search_chunks(
                query_vector=[0.1] * 384,
                course_code="BACSE202",
                require_atlas=True,
            )
        collection.aggregate.assert_not_called()

    @patch("app.services.question_generation_service.GeneratedQuestionRepository.save_generated_questions_batch")
    @patch("app.services.question_generation_service.GeneratedQuestionRepository.get_generated_questions_by_course", return_value=[])
    @patch("app.services.question_generation_service.QuestionGenerationService._call_gemini")
    @patch("app.services.question_generation_service.VectorSearchService.search")
    @patch("app.services.question_generation_service.CourseRepository.get_course")
    def test_generate_retrieves_validates_and_persists_with_exact_sources(
        self, course_lookup, search, gemini, history, persist
    ):
        course_lookup.return_value = self.course
        search.return_value = self.context
        gemini.return_value = self.valid_output
        persist.side_effect = lambda questions: [
            GeneratedQuestionInDB(**question.model_dump(), id="generated-1") for question in questions
        ]

        result = QuestionGenerationService.generate(self.request)

        self.assertEqual(result.context_count, 1)
        self.assertEqual(len(result.questions), 1)
        self.assertEqual(result.questions[0].sources[0].chunk_id, "chunk-12345678")
        self.assertEqual(result.questions[0].answer, self.valid_output["questions"][0]["answer"])
        self.assertTrue(search.call_args.kwargs["require_atlas"])
        persist.assert_called_once()

    @patch("app.services.question_generation_service.QuestionGenerationService._call_gemini")
    @patch("app.services.question_generation_service.VectorSearchService.search")
    @patch("app.services.question_generation_service.CourseRepository.get_course")
    def test_empty_context_stops_before_gemini(self, course_lookup, search, gemini):
        course_lookup.return_value = self.course
        search.return_value = VectorSearchResponse(
            query="database",
            target=VectorSearchTarget.COURSE_CONTENT,
            course_code="BACSE202",
            total_results=0,
            results=[],
        )

        with self.assertRaises(EmptyRetrievalContextError):
            QuestionGenerationService.generate(self.request)
        gemini.assert_not_called()

    @patch("app.services.question_generation_service.GeneratedQuestionRepository.get_generated_questions_by_course", return_value=[])
    @patch("app.services.question_generation_service.QuestionGenerationService._call_gemini")
    @patch("app.services.question_generation_service.VectorSearchService.search")
    @patch("app.services.question_generation_service.CourseRepository.get_course")
    def test_rejects_source_chunk_ids_outside_retrieved_context(self, course_lookup, search, gemini, history):
        course_lookup.return_value = self.course
        search.return_value = self.context
        output = {"questions": [dict(self.valid_output["questions"][0], source_chunk_ids=["invented-chunk"])]}
        gemini.return_value = output

        with self.assertRaises(InvalidGeneratedOutputError):
            QuestionGenerationService.generate(self.request)


if __name__ == "__main__":
    unittest.main()
