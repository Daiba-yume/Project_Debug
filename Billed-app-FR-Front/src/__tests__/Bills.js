/**
 * @jest-environment jsdom
 */

import { screen, waitFor, fireEvent } from "@testing-library/dom";
import BillsUI from "../views/BillsUI.js";
import { bills } from "../fixtures/bills.js";
import Bills from "../containers/Bills.js";
import { ROUTES_PATH, ROUTES } from "../constants/routes.js";
import { localStorageMock } from "../__mocks__/localStorage.js";
import mockStore from "../__mocks__/store";
import router from "../app/Router.js";

// Mock de la partie 'store' pour simuler les appels à l'API
jest.mock("../app/store", () => mockStore);

// Fonction pour créer une nouvelle instance de la classe Bills
const setupBills = () => {
  return new Bills({
    document,
    onNavigate: (pathname) => {
      document.body.innerHTML = ROUTES({ pathname });
    },
    store: mockStore,
    localStorage: window.localStorage,
  });
};

// Fonction pour afficher la page souhaitée en fonction du paramètre (pathname)
const setupPage = (pathname) => {
  document.body.innerHTML = "";
  const root = document.createElement("div");
  root.setAttribute("id", "root");
  document.body.append(root);
  router();
  window.onNavigate(pathname);
};

// Début des tests pour la page Bills
describe("Given I am connected as an employee", () => {
  describe("When I am on Bills Page", () => {
    test("Then bill icon in vertical layout should be highlighted", async () => {
      Object.defineProperty(window, "localStorage", {
        value: localStorageMock,
      });
      window.localStorage.setItem(
        "user",
        JSON.stringify({
          type: "Employee",
        })
      );
      // Initialise la page Bills
      const root = document.createElement("div");
      root.setAttribute("id", "root");
      document.body.append(root);
      router();
      window.onNavigate(ROUTES_PATH.Bills);

      // Attends que l'icône soit présente et vérifie si elle est active
      await waitFor(() => screen.getByTestId("icon-window"));
      const windowIcon = screen.getByTestId("icon-window");
      //to-do write expect expression
      expect(windowIcon.className).toBe("active-icon");
    });
    test("Then bills should be ordered from earliest to latest", () => {
      document.body.innerHTML = BillsUI({ data: bills });
      const dates = screen
        .getAllByText(
          /^(19|20)\d\d[- /.](0[1-9]|1[012])[- /.](0[1-9]|[12][0-9]|3[01])$/i
        )
        .map((a) => a.innerHTML);
      const antiChrono = (a, b) => (a < b ? 1 : -1);
      const datesSorted = [...dates].sort(antiChrono);
      expect(dates).toEqual(datesSorted);
    });
    // Test : Vérifie si la modal s'ouvre lorsqu'on clique sur l'icon d'œil
    test("Then a modal should open when clicking on an eye icon", () => {
      document.body.innerHTML = BillsUI({ data: bills });
      const eyesIcons = screen.getAllByTestId("icon-eye");

      // Ajout d'un event clic sur chaque icon et vérifie si la modal s'affiche
      eyesIcons.forEach((eyeIcon) => {
        eyeIcon.addEventListener("click", () => {
          const modal = document.getElementById("modaleFile");
          expect(modal).toBeTruthy();
        });
        fireEvent.click(eyeIcon);
      });
    });
    // Test : Vérifie si la fonction handleClickIconEye ouvre bien la modal avec l'image de la facture
    test("handleClickIconEye should open the modal with the bill image", () => {
      document.body.innerHTML = BillsUI({ data: bills });
      const testInstance = setupBills();

      const eyeIcon = screen.getAllByTestId("icon-eye")[0];
      $.fn.modal = jest.fn(); // Mock de la fonction modal de Bootstrap

      // Simule l'event clic sur l'icon
      const handleClickIconEye = jest.fn(() =>
        testInstance.handleClickIconEye(eyeIcon)
      );

      eyeIcon.addEventListener("click", handleClickIconEye);
      fireEvent.click(eyeIcon);

      // Vérifie si la fonction et la modal ont été appelées
      expect(handleClickIconEye).toHaveBeenCalled();
      expect($.fn.modal).toHaveBeenCalled();
    });
  });

  // Tests pour gérer les erreurs de l'API
  describe("When an error occurs on API", () => {
    // Avant chaque test d'erreur,
    //on configure le mockStore pour espionner les appels

    beforeEach(() => {
      jest.spyOn(mockStore, "bills");
      setupPage(ROUTES_PATH.Bills);
    });

    // Fonction pour tester les erreurs de récupération

    const testFetchError = async (errorMessage) => {
      mockStore.bills.mockImplementationOnce(() => ({
        list: () => Promise.reject(new Error(errorMessage)),
      }));
      window.onNavigate(ROUTES_PATH.Bills);
      await new Promise(process.nextTick);
      const message = screen.getByText(new RegExp(errorMessage, "i"));
      expect(message).toBeTruthy();
    };
    // Simule une erreur 404 lors de la récupération des factures
    test("Then fetches fails with 404 message error from mock API GET", async () => {
      await testFetchError("Erreur 404");
    });
    // Simule une erreur 500 lors de la récupération des factures
    test("Then fetches fails with 500 message error from mock API GET", async () => {
      await testFetchError("Erreur 500");
    });
  });
});
