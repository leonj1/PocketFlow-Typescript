import Link from "next/link";
import { CircleAlert } from "lucide-react";

export default function NotFound() {
  return (
    <section className="not-found">
      <CircleAlert size={34} />
      <h1>Room not found.</h1>
      <p>It may have been deleted or the address may be incomplete.</p>
      <Link className="primary-button" href="/chats">Return to chats</Link>
    </section>
  );
}
