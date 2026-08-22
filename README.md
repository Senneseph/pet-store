# Pet Store — a WebAX reference app

The acceptance test for WebAX: hand it an OpenAPI spec + a UI spec + a workflow
spec and get a working application.

This app wires the two WebAX libraries together:

- **jcule** — Business Logic Controller (`openApiToUxAAS` → `MutherBrane` → `createWorkflow`)
- **jellicule** — native web component library (`jel-button`, `jel-badge`, `jel-list`, …)

## Run it

Build both libraries first, then serve the meta-project root:

```bash
(cd ../jcule && npm install && npm run build)
(cd ../jellicule && npm install && npm run build)
python3 -m http.server 8000    # from the meta-project root
```

Open <http://localhost:8000/pet-store/app/index.html>.

The app lists "available" pets from the real Swagger Pet Store
(`https://petstore3.swagger.io/api/v3`), lets you **Add a pet** (the form is
generated from the OpenAPI spec), and **Adopt** a pet (enforced by the workflow:
`available → pending`).

## What demonstrates the vision

| Spec → | Layer | → Output |
|---|---|---|
| `specs/petstore.json` (OpenAPI) | `openApiToUxAAS` | UIxAAS resources/views/actions/fields |
| UIxAAS + `MutherBrane.renderView` | jellicule | generated create-form UI |
| `specs/workflow.json` (decision tree) | `createWorkflow` | enforced state transitions |
