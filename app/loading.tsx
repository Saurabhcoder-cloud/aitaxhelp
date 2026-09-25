import { LoadingState } from "../components/ui/LoadingState";

export default function Loading() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <LoadingState message="Loading TaxAIHelp platform..." />
    </div>
  );
}
