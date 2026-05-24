# Retrieval evaluation harness

`yarn eval --collection <uuid>` runs the hybrid retriever against a fixture
of golden queries and prints precision@k / recall@k / MRR.

## Fixture format

`eval/fixtures.json` is a JSON array of rows:

```json
[
  {
    "query": "What is the SLA on response time?",
    "expectedDocumentIds": ["uuid-1", "uuid-2"]
  }
]
```

Each row's `expectedDocumentIds` is the set of documents that should appear
in the top-k retrieval — any chunk from any of those documents counts as a
hit.

## Scoring

- **Precision@k**: fraction of retrieved chunks whose document is in the
  expected set.
- **Recall@k**: fraction of expected documents that appear at least once in
  the retrieved chunks.
- **MRR (Mean Reciprocal Rank)**: 1 / (rank of first hit), averaged across
  queries; 0 if no hit.

## Adding your own fixtures

1. Upload your documents to a collection.
2. Ask the questions you'd want the system to answer; note the document IDs
   that should ground each answer.
3. Drop them into `eval/fixtures.json` (or pass `--fixture path` for a
   custom file).
4. Run `yarn eval --collection <collection-uuid>`.
