import { getLatestCards } from "@/lib/store";
import { NewsCard } from "@/types";
import Feed from "@/components/Feed";

export const revalidate = 300;

export default async function Home() {
  let initialCards: NewsCard[] = [];
  try {
    initialCards = await getLatestCards(30, 0);
  } catch {
    initialCards = [];
  }

  return (
    <main className="min-h-screen bg-white">
      <Feed initialCards={initialCards} />
    </main>
  );
}
