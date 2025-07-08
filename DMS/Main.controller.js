sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/Link"
  ], function (Controller, JSONModel, Link) {
    "use strict";
  
    return Controller.extend("dmsui.controller.Main", {
      onInit: function () {
        const aFolders = [
          { FolderUUID: "30c1d5b1", Name: "Aman", ParentFolder_FolderUUID: "b6d0136f" },
          { FolderUUID: "3b857914", Name: "LocalDisk D", ParentFolder_FolderUUID: "7cc4e5b2" },
          { FolderUUID: "7187c53c", Name: "Image", ParentFolder_FolderUUID: "3b857914" },
          { FolderUUID: "7cc4e5b2", Name: "root", ParentFolder_FolderUUID: "-1" },
          { FolderUUID: "b6d0136f", Name: "Resume", ParentFolder_FolderUUID: "3b857914" },
          { FolderUUID: "b81189b1", Name: "Rishiraj", ParentFolder_FolderUUID: "b6d0136f" },
          { FolderUUID: "cda6929d", Name: "LocalDisk C", ParentFolder_FolderUUID: "7cc4e5b2" }
        ];
  
        const oModel = new JSONModel({
          allFolders: aFolders,
          currentChildren: [],
          breadcrumb: []
        });
  
        this.getView().setModel(oModel, "foldersModel");
  
        // Find root (parent = -1)
        const oRootFolder = aFolders.find(f => f.ParentFolder_FolderUUID === "-1");
        if (oRootFolder) {
          this._navigateToFolder(oRootFolder);
        }
      },
  
      onFolderPress: function (oEvent) {
        const oItem = oEvent.getParameter("listItem");
        const oFolder = oItem.getBindingContext("foldersModel").getObject();
        this._navigateToFolder(oFolder);
      },
  
      _navigateToFolder: function (oFolder) {
        const oModel = this.getView().getModel("foldersModel");
        const aAll = oModel.getProperty("/allFolders");
  
        // Get children of selected folder
        const aChildren = aAll.filter(f => f.ParentFolder_FolderUUID === oFolder.FolderUUID);
        oModel.setProperty("/currentChildren", aChildren);
  
        // Update breadcrumb
        let aBreadcrumb = oModel.getProperty("/breadcrumb");
  
        // If going deeper, add to breadcrumb; else, rebuild it
        const existingIndex = aBreadcrumb.findIndex(b => b.FolderUUID === oFolder.FolderUUID);
        if (existingIndex === -1) {
          aBreadcrumb.push(oFolder);
        } else {
          aBreadcrumb = aBreadcrumb.slice(0, existingIndex + 1);
        }
  
        oModel.setProperty("/breadcrumb", aBreadcrumb);
        this._renderBreadcrumb();
      },
  
      _renderBreadcrumb: function () {
        const oBreadcrumb = this.byId("breadcrumb");
        oBreadcrumb.removeAllLinks();
  
        const oModel = this.getView().getModel("foldersModel");
        const aCrumbs = oModel.getProperty("/breadcrumb");
  
        for (let i = 0; i < aCrumbs.length; i++) {
          const crumb = aCrumbs[i];
          const oLink = new Link({
            text: crumb.Name,
            press: this._onBreadcrumbPress.bind(this, crumb)
          });
          oBreadcrumb.addLink(oLink);
        }
      },
  
      _onBreadcrumbPress: function (oFolder) {
        this._navigateToFolder(oFolder);
      }
    });
  });
  