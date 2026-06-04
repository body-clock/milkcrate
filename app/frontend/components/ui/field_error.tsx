interface FieldErrorProps {
  errorId?: string;
  error?: string;
}

export default function FieldError({ errorId, error }: FieldErrorProps) {
  if (!error) {
    return null;
  }
  return (
    <p id={errorId} role="alert" className="text-xs font-medium text-mc-feedback-danger">
      {error}
    </p>
  );
}
