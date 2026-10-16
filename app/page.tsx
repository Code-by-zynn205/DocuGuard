// /**
//  * app/page.tsx — Trang gốc (/)
//  *
//  * Hiện tại: redirect đến /dashboard
//  * Sau này: có thể là trang landing/login
//  */
// import { redirect } from 'next/navigation';

// export default function HomePage() {
//   // redirect('/dashboard');
//   redirect('/');
// }
import DashboardPage from './(dashboard)/page';

export default function HomePage() {
  return <DashboardPage />;
}