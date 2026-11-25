import { redirect } from "next/navigation";

// Middleware already gates auth; signed-in users land on the theme picker.
export default function Home() {
  redirect("/themes");
}
