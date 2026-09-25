import Link from "next/link";
export default function NotFound() {
  return (
    <div className="empty">
      <h1>That page isn’t here</h1>
      <p>Let’s get you back to your business.</p>
      <Link className="button primary" href="/">
        Open dashboard
      </Link>
    </div>
  );
}
