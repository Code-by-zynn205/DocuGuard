import { redirect, RedirectType } from "next/navigation";
import { ROUTES } from "@/constants";

/**
 * Trang gốc (/): chuyển hướng HTTP 307 sang /dashboard.
 */
export default function HomePage() {
  redirect(ROUTES.DASHBOARD, RedirectType.replace);
}
