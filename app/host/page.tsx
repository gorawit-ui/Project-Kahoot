import { cookies } from "next/headers";
import HostDashboard from "./host-dashboard";
import HostLogin from "./host-login";
import { HOST_SESSION_COOKIE, isValidHostSession } from "@/lib/host-auth";

export default async function HostPage() {
  const session = (await cookies()).get(HOST_SESSION_COOKIE)?.value;
  return isValidHostSession(session) ? <HostDashboard /> : <HostLogin />;
}
