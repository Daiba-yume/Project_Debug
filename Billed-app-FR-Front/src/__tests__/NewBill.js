/**
 * @jest-environment jsdom
 */

import { fireEvent, screen, waitFor } from "@testing-library/dom";
import NewBillUI from "../views/NewBillUI.js";
import NewBill from "../containers/NewBill.js";
import { ROUTES } from "../constants/routes.js";
import { localStorageMock } from "../__mocks__/localStorage.js";
import mockStore from "../__mocks__/store";
import router from "../app/Router.js";

jest.mock("../app/Store", () => mockStore);

// Création de l'instance de NewBill avec des paramètres communs
const createNewBillInstance = () => {
  document.body.innerHTML = NewBillUI();
  return new NewBill({
    document,
    onNavigate: (pathname) => {
      document.body.innerHTML = ROUTES({ pathname });
    },
    store: mockStore,
    localStorage: window.localStorage,
  });
};

// Configuration initiale avant chaque test
beforeEach(() => {
  Object.defineProperty(window, "localStorage", {
    value: localStorageMock,
  });
  window.localStorage.setItem("user", JSON.stringify({ type: "Employee" }));
  const root = document.createElement("div");
  root.setAttribute("id", "root");
  document.body.append(root);
  router();
});

// Clean après chaque test
afterEach(() => {
  document.body.innerHTML = "";
  jest.clearAllMocks();
});

describe("Given I am connected as an employee", () => {
  describe("When I am on NewBill Page", () => {
    test("Then the bill should be created successfully", async () => {
      const newBill = createNewBillInstance();

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

    test("Then I upload a file with a valid format", () => {
      // Initialise le formulaire NewBill et crée une instance de NewBill
      const newBill = createNewBillInstance();
      // Simule la méthode handleChangeFile pour gérer l'upload de fichier
      const handleChangeFile = jest.fn(newBill.handleChangeFile);
      // Sélectionne le champ de fichier (upload) dans le DOM
      const file = screen.getByTestId("file");

      // Ajout de l'event "change" pour détecter un fichier téléchargé
      file.addEventListener("change", handleChangeFile);

      // Simule le téléchargement d'un fichier image PNG valide
      fireEvent.change(file, {
        target: {
          files: [new File(["file.png"], "file.png", { type: "image/png" })],
        },
      });

      // On Vérifie que handleChangeFile a bien été appelé
      //et que le fichier est bien chargé
      expect(handleChangeFile).toHaveBeenCalled();
      expect(file.files[0].name).toBe("file.png");
      expect(newBill.formData).not.toBe(null);
    });
    test("Then I upload file with the wrong format", async () => {
      const newBill = createNewBillInstance();
      // Simule la fonction handleChangeFile pour vérifier son appel
      const handleChangeFile = jest.fn(newBill.handleChangeFile);
      // Sélectionne le champ de fichier dans le DOM
      const inputFile = screen.getByTestId("file");
      // Simule une alerte globale pour les tests
      global.alert = jest.fn();

      // Ajoute d'un event pour les changements de fichier
      inputFile.addEventListener("change", handleChangeFile);
      // Simule le changement de fichier avc un fichier wrong format
      fireEvent.change(inputFile, {
        target: {
          files: [
            new File(["../assets/images/test.txt"], "test.txt", {
              type: "application/txt",
            }),
          ],
        },
      });
      // Vérifie que handleChangeFile a été appelé
      expect(handleChangeFile).toBeCalled();
      // le texte est affiché
      expect(screen.getByText("Envoyer une note de frais")).toBeTruthy();
      // Vérifie que le champ de fichier est toujours présent dans le DOM
      expect(screen.getAllByTestId("file")).toBeTruthy();
    });

    describe("When I submit and an error occurs", () => {
      //Test la gestion des erreurs la méthode `update` échoue
      const testErrorHandling = async (errorCode) => {
        // Mock de la méthode update pour simuler une erreur
        const updateMock = jest.fn().mockRejectedValue(new Error(errorCode));
        // Remplace la méthode bills du store pour utiliser le mock
        mockStore.bills = jest.fn(() => ({
          create: jest.fn().mockResolvedValue({}),
          update: updateMock,
        }));

        const newBill = createNewBillInstance();

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

  // test d'intégration POST (ajout d'une note de frais via l'API)
  describe("When I am on NewBill Page, I fill the form and submit", () => {
    test("Then the bill is added to API POST", async () => {
      // Charger la page NewBill
      const html = NewBillUI();
      document.body.innerHTML = html;
      const newBill = createNewBillInstance();

      // Création des données de la note de frais à tester
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

      //Remplissage des différents champs
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

      // Configurer la soumission du formulaire
      const newBillForm = screen.getByTestId("form-new-bill");
      const handleSubmit = jest.fn(newBill.handleSubmit.bind(newBill));
      newBillForm.addEventListener("submit", handleSubmit);

      // Ajout d'un fichier à la note de frais
      const fileField = screen.getByTestId("file");
      fireEvent.change(fileField, {
        target: {
          files: [
            new File([bill.fileName], bill.fileUrl, { type: "image/png" }),
          ],
        },
      });
      expect(fileField.files[0].name).toBe(bill.fileUrl);
      expect(fileField.files[0].type).toBe("image/png");

      // SSoumission du form et vérifie l'appel de la fonction
      fireEvent.submit(newBillForm);
      expect(handleSubmit).toHaveBeenCalled();
    });
  });
});
