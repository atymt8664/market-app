import { useRoute } from "wouter";
import CreateAd from "./create-ad";

export default function EditAd() {
  const [, params] = useRoute<{ id: string }>("/edit/:id");
  const id = params?.id ? Number(params.id) : NaN;
  if (!Number.isFinite(id)) return null;
  return <CreateAd editId={id} />;
}
