import { createBrowserRouter } from "react-router-dom";
import Layout from "./components/Layout";
import Overview from "./pages/Overview";
import TheTeam from "./pages/TheTeam";
import Projects from "./pages/Projects";
import Chats from "./pages/Chats";
import ControlCenter from "./pages/ControlCenter";
import Users from "./pages/Users";
import Settings from "./pages/Settings";
import Account from "./pages/Account";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout />,
    children: [
      { index: true, element: <Overview /> },
      { path: "the-team", element: <TheTeam /> },
      { path: "projects", element: <Projects /> },
      { path: "chats", element: <Chats /> },
      { path: "admin/control-center", element: <ControlCenter /> },
      { path: "users", element: <Users /> },
      { path: "admin/settings", element: <Settings /> },
      { path: "account", element: <Account /> },
      { path: "*", element: <Overview /> },
    ],
  },
]);
