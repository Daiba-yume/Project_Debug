/**
 * @jest-environment jsdom
 */

import { screen, fireEvent } from "@testing-library/dom";
import NewBillUI from "../views/NewBillUI.js";
import NewBill from "../containers/NewBill.js";
import mockStore from "../__mocks__/store.js";
import { localStorageMock } from "../__mocks__/localStorage.js";
import { ROUTES } from "../constants/routes.js";

describe("Given I am connected as an employee", () => {
  describe("When I am on NewBill Page", () => {
    test("Then the bill should be created successfully", () => {
      const html = NewBillUI();
      document.body.innerHTML = html;
      const onNavigate = (pathname) => {
        document.body.innerHTML = ROUTES({ pathname });
      };

      Object.defineProperty(window, "localStorage", {
        value: localStorageMock,
      });
      window.localStorage.setItem("user", JSON.stringify({ type: "Employee" }));

      const newBill = new NewBill({
        document,
        onNavigate,
        store: mockStore,
        localStorage: localStorageMock,
      });

      screen.getByTestId("expense-type").value = "Transports";
      screen.getByTestId("expense-name").value = "Vol Paris-Espagne";
      screen.getByTestId("datepicker").value = "2023-08-28";
      screen.getByTestId("amount").value = "100";
      screen.getByTestId("vat").value = "20";
      screen.getByTestId("pct").value = "20";
      screen.getByTestId("commentary").value = "Voyage d'affaires";

      const form = screen.getByTestId("form-new-bill");
      form.addEventListener("submit", newBill.handleSubmit);
      fireEvent.submit(form);

      expect(screen.getByText("Mes notes de frais")).toBeTruthy();
    });
  });
});
