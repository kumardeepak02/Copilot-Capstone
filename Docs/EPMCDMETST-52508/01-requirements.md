# EPMCDMETST-52508 Requirements

## EPMCDMETST-52508 — [BE] Document Intake and Validation for Multiple Document Formats

**User Story**: As a system administrator, I want the system to validate and accept PDF, DOC, RTF,
and XLS files for processing so that documents in multiple formats can enter the processing pipeline
and invalid files are rejected with appropriate error messages.

### Functional Requirements
- **FR-38**: Accept document uploads through both the batch upload interface and the API.
- **FR-39**: Support PDF files up to PDF 2.0, Microsoft Word DOC and DOCX files, Rich Text Format
	(RTF) files, and Microsoft Excel XLS and XLSX files.
- **FR-40**: Detect document format from file signatures rather than trusting filename extensions;
	reject uploads when the detected format does not match the extension.
- **FR-41**: Validate format-specific structure and integrity before accepting a document.
- **FR-42**: Accept files up to and including 100 MiB; reject larger files with a descriptive error.
- **FR-43**: Detect encrypted or password-protected documents and prompt for a password or provide
	appropriate password-required handling when needed. The supported protected formats and exact
	password interaction are unspecified.
- **FR-44**: Generate a unique DocumentID for each successfully accepted document.
- **FR-45**: Calculate and store an MD5 hash for document integrity verification.
- **FR-46**: Extract and store the filename, file size, upload date, and detected document format.
- **FR-47**: Store each accepted original file and persist its storage path/reference and DocumentFormat
	in the document record.
- **FR-48**: Return a success confirmation containing the DocumentID for accepted documents. For
	validation failures, return a descriptive error without issuing a DocumentID or persisting the
	rejected document.

### Non-Functional Requirements
- **NFR-27**: Sanitize and validate uploaded input to prevent injection attacks.

### Assumptions & Constraints
- The relational database and file storage are configured, accessible, and have sufficient capacity;
	required document-parsing libraries are installed.
- Both the batch upload interface and API are in scope, as confirmed by the requester.
- The maximum accepted file size is 100 MiB, as confirmed by the requester.
- Extension/signature mismatches are rejected, as confirmed by the requester.
- Password handling is required for protected documents, but the ticket does not specify which
	protected formats support password entry or the exact password submission/prompt flow.

### Out of Scope
- No additional out-of-scope items are specified in the ticket.
