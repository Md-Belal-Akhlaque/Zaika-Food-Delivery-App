/**
 * validate middleware
 * - Takes a Zod schema and validates req.body against it
 * - Returns 400 if validation fails with descriptive error messages
 */
export const validate = (schema) => (req, res, next) => {
  try {
    schema.parse(req.body);
    next();
  } catch (err) {
    const issues = Array.isArray(err?.errors)
      ? err.errors
      : Array.isArray(err?.issues)
      ? err.issues
      : [];

    const formattedErrors = issues.map((e) => ({
      field: Array.isArray(e?.path) && e.path.length ? e.path.join(".") : "body",
      message: e?.message || "Invalid request",
    }));

    return res.status(400).json({
      success: false,
      errors:
        formattedErrors.length > 0
          ? formattedErrors
          : [{ field: "body", message: err?.message || "Validation failed" }],
    });
  }
};
