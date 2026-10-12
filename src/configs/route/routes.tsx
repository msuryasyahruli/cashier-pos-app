import { createBrowserRouter } from "react-router-dom";
import { RootLayout } from "./RootLayout";
import { RequireAuth } from "../../components/auth/RequireAuth";
import {
  PosPage,
  TransactionsPage,
  InventoryPage,
  SettingsPage,
  NotFoundPage,
  LoginPage,
} from "../../pages";

export const router = createBrowserRouter([
  {
    path: "/",
    element: (
      <RequireAuth>
        <RootLayout />
      </RequireAuth>
    ),
    children: [
      {
        index: true,
        element: <PosPage />,
      },
      {
        path: "transactions",
        element: <TransactionsPage />,
      },
      {
        path: "inventory",
        element: <InventoryPage />,
      },
      {
        path: "settings",
        element: <SettingsPage />,
      },
      {
        path: "*",
        element: <NotFoundPage />,
      },
    ],
  },
  {
    path: "/login",
    element: <LoginPage />,
  },
]);
