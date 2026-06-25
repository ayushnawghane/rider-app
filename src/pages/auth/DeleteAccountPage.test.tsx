import { render, screen } from "@testing-library/react";
import { IonPage } from "@ionic/react";
import { Router } from "react-router-dom";
import { createMemoryHistory } from "history";
import { beforeEach, describe, expect, it, vi } from "vitest";
import DeleteAccountPage from "./DeleteAccountPage";

const mocks = vi.hoisted(() => ({
  useAuth: vi.fn(),
}));

vi.mock("../../context/AuthContext", () => ({
  useAuth: mocks.useAuth,
}));

vi.mock("../../services", () => ({
  authService: {
    deleteAccount: vi.fn(),
  },
}));

describe("DeleteAccountPage", () => {
  beforeEach(() => {
    mocks.useAuth.mockReturnValue({
      user: {
        id: "user-123",
      },
    });
  });

  it("renders inside the route IonPage without nesting another IonPage", () => {
    const history = createMemoryHistory({
      initialEntries: ["/delete-account"],
    });
    const { container } = render(
      <Router history={history}>
        <IonPage>
          <DeleteAccountPage />
        </IonPage>
      </Router>,
    );

    expect(
      screen.getByRole("heading", { name: "Delete Account" }),
    ).toBeInTheDocument();
    expect(container.querySelectorAll(".ion-page")).toHaveLength(1);
  });
});
