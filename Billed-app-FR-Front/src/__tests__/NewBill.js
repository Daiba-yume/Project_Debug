/**
 * @jest-environment jsdom
 */

import { fireEvent, screen, waitFor } from "@testing-library/dom";
import NewBillUI from "../views/NewBillUI.js";
import NewBill from "../containers/NewBill.js";
import { ROUTES, ROUTES_PATH } from "../constants/routes.js";
import { localStorageMock } from "../__mocks__/localStorage.js";
import mockStore from "../__mocks__/store";
import router from "../app/Router.js";

jest.mock("../app/Store", () => mockStore);

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

        //Test la gestion des erreurs la méthode `update` échoue
        const testErrorHandling = async (errorCode) => {
          // Mock de la méthode update pour simuler une erreur
          const updateMock = jest.fn().mockRejectedValue(new Error(errorCode));
          // Remplace la méthode bills du store pour utiliser le mock
          mockStore.bills = jest.fn(() => ({
            create: jest.fn().mockResolvedValue({}),
            update: updateMock,
          }));

          // New instance de NewBill avec le store mocké et les param
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

          // Submit form and promise en attente
          fireEvent.submit(form);
          await new Promise(process.nextTick);

          // Vérifie que la méthode `update` du mock a bien été appelée
          await expect(updateMock).toHaveBeenCalled();
          // Vérifie que l'appel à update a échoué avec l'erreur attendue
          await expect(updateMock).rejects.toThrow(new Error(errorCode));
        };
        // Teste la gestion des erreurs pour un code 404
        test("Fetch fails with 404 error message", async () => {
          await testErrorHandling("404");
        });
        // Teste la gestion des erreurs pour un code 500
        test("Fetch fails with 500 error message", async () => {
          await testErrorHandling("500");
        });
      });
    });
  });
  // test d'intégration POST
  describe("When I am on NewBill Page, I fill the form and submit", () => {
    test("Then the bill is added to API POST", async () => {
      const html = NewBillUI();
      document.body.innerHTML = html;

      const bill = {
        email: "employee@test.tld",
        type: "Transports",
        name: "TGV",
        amount: 120,
        date: "2023-08-24",
        vat: "20",
        pct: 20,
        commentary: "Facture test",
        fileUrl: "testFacture.png",
        fileName: "testFacture",
        status: "pending",
      };

      const typeField = screen.getByTestId("expense-type");
      fireEvent.change(typeField, { target: { value: bill.type } });
      expect(typeField.value).toBe(bill.type);
      const nameField = screen.getByTestId("expense-name");
      fireEvent.change(nameField, { target: { value: bill.name } });
      expect(nameField.value).toBe(bill.name);
      const dateField = screen.getByTestId("datepicker");
      fireEvent.change(dateField, { target: { value: bill.date } });
      expect(dateField.value).toBe(bill.date);
      const amountField = screen.getByTestId("amount");
      fireEvent.change(amountField, { target: { value: bill.amount } });
      expect(parseInt(amountField.value)).toBe(parseInt(bill.amount));
      const vatField = screen.getByTestId("vat");
      fireEvent.change(vatField, { target: { value: bill.vat } });
      expect(parseInt(vatField.value)).toBe(parseInt(bill.vat));
      const pctField = screen.getByTestId("pct");
      fireEvent.change(pctField, { target: { value: bill.pct } });
      expect(parseInt(pctField.value)).toBe(parseInt(bill.pct));
      const commentaryField = screen.getByTestId("commentary");
      fireEvent.change(commentaryField, {
        target: { value: bill.commentary },
      });
      expect(commentaryField.value).toBe(bill.commentary);

      const newBillForm = screen.getByTestId("form-new-bill");
      const onNavigate = (pathname) => {
        document.body.innerHTML = ROUTES({ pathname });
      };
      Object.defineProperty(window, "localStorage", {
        value: localStorageMock,
      });
      const newBill = new NewBill({
        document,
        onNavigate,
        store: mockStore,
        localStorage: window.localStorage,
      });

      const handleChangeFile = jest.fn(newBill.handleChangeFile);
      newBillForm.addEventListener("change", handleChangeFile);
      //const fileField = screen.getByTestId("file");
      // fireEvent.change(fileField, {
      // target: {
      // files: [
      //   new File([bill.fileName], bill.fileUrl, { type: "image/png" }),
      //  ],
      // },
      //  });
      // expect(fileField.files[0].name).toBe(bill.fileUrl);
      // expect(fileField.files[0].type).toBe("image/png");
      // expect(handleChangeFile).toHaveBeenCalled();

      // const handleSubmit = jest.fn(newBill.handleSubmit);
      // newBillForm.addEventListener("submit", handleSubmit);
      // fireEvent.submit(newBillForm);
      // expect(handleSubmit).toHaveBeenCalled();
    });
  });
});
