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
    test("Then the bill should be created successfully", async () => {
      // Génère et insère le HTML de la page NewBill dans le DOM
      document.body.innerHTML = NewBillUI();

      // Simule la navigation en modifiant le contenu du DOM
      const onNavigate = (pathname) => {
        document.body.innerHTML = ROUTES({ pathname });
      };

      // Mock du localStorage pour simuler un utilisateur connecté
      Object.defineProperty(window, "localStorage", {
        value: localStorageMock,
      });
      window.localStorage.setItem("user", JSON.stringify({ type: "Employee" }));

      // Création de l'instance NewBill
      const newBill = new NewBill({
        document,
        onNavigate,
        store: mockStore,
        localStorage: window.localStorage,
      });

      // Remplissage des champs du formulaire
      screen.getByTestId("expense-type").value = "Transports";
      screen.getByTestId("expense-name").value = "Vol Paris-Espagne";
      screen.getByTestId("datepicker").value = "2023-08-28";
      screen.getByTestId("amount").value = "100";
      screen.getByTestId("vat").value = "20";
      screen.getByTestId("pct").value = "20";
      screen.getByTestId("commentary").value = "Voyage d'affaires";

      // Soumission du formulaire
      const form = screen.getByTestId("form-new-bill");
      form.addEventListener("submit", newBill.handleSubmit);
      fireEvent.submit(form);

      // Vérifie que l'interface utilisateur a bien changé après la soumission
      expect(screen.getByText("Mes notes de frais")).toBeTruthy();
    });

    describe("When I submit and an error occurs", () => {
      beforeEach(() => {
        document.body.innerHTML = NewBillUI();
      });

      //Clean le DOM et réinitialise les mocks
      afterEach(() => {
        afterEach(() => {
          document.body.innerHTML = "";
          jest.clearAllMocks();
        });

        //Test la gestion des erreurs
        const testErrorHandling = async (errorCode) => {
          // Mock de la méthode update pour simuler une erreur
          const updateMock = jest.fn().mockRejectedValue(new Error(errorCode));
          // Remplace la méthode bills du store pour utiliser le mock
          mockStore.bills = jest.fn(() => ({
            create: jest.fn().mockResolvedValue({}),
            update: updateMock,
          }));

          // New instance de NewBill avec le store mocké
          const newBill = new NewBill({
            document,
            onNavigate: (pathname) => {
              document.body.innerHTML = ROUTES({ pathname });
            },
            store: mockStore,
            localStorage: window.localStorage,
          });

          // Select form depuis le DOM
          const form = screen.getByTestId("form-new-bill");
          form.addEventListener("submit", (e) => newBill.handleSubmit(e));

          // Submit form and promise
          fireEvent.submit(form);
          await new Promise(process.nextTick);

          // Vérifie que l'erreur simulée est bien levée
          await expect(updateMock).toHaveBeenCalled();
          // Vérifie que l'appel à update a échoué avec l'erreur attendue
          await expect(updateMock).rejects.toThrow(new Error(errorCode));
        };
        // Teste la gestion des erreurs pour un code 404
        test("Fetch fails with 404 error message", async () => {
          await testErrorHandling("404");
        });
        // Teste la gestion des erreurs pour un code 404
        test("Fetch fails with 500 error message", async () => {
          await testErrorHandling("500");
        });
      });
    });
  });
});
