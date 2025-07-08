sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/ui/model/json/JSONModel",
  "sap/ui/model/Filter",
  "sap/m/Link",
  "sap/m/PDFViewer",
  "sap/ui/model/FilterOperator",
  "sap/m/MessageBox",
  "sap/m/MessageToast"
], function (Controller, JSONModel, Filter, Link, PDFViewer, FilterOperator,MessageBox,MessageToast) {
  "use strict";

  return Controller.extend("dmsui.controller.Main", {
    onInit: function () {
      this._loadRootFolder();
      this._clickTimer = null;
      this._clickDelay = 300; // milliseconds
    },

    _loadRootFolder: function () {
      const oModel = this.getOwnerComponent().getModel("dms");

      // const oFilter = new Filter("ParentFolder_FolderUUID", "EQ", "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx");
      var oFilter = new sap.ui.model.Filter("FolderUUID", sap.ui.model.FilterOperator.EQ, "7cc4e5b2-00ad-45c4-8683-7c4608ca6e16"); // string "-1"


      const oBinding = oModel.bindList("/Folder", undefined, undefined, [oFilter], {
        $expand: {
          SubFolders: {},
          AllFiles: {}
        }
      });


      oBinding.requestContexts().then(function (aContexts) {
        if (aContexts.length > 0) {
          const oRoot = aContexts[0].getObject();

          const oJSONModel = new JSONModel({
            currentFolder: oRoot,
            currentSubFolders: oRoot.SubFolders || [],
            currentFiles: oRoot.AllFiles || [],
            breadcrumb: [oRoot]
          });

          this.getView().setModel(oJSONModel, "foldersModel");
          this._renderBreadcrumb();
        }
      }.bind(this)).catch(function (oError) {
        console.error("Root load failed", oError);
      });
    },
    onItemClick: function (oEvent) {
      var that = this;
    
      if (this._clickTimer) {
        // Second click within delay – treat as double-click
        clearTimeout(this._clickTimer);
        this._clickTimer = null;
        this.onFolderPress(oEvent);
      } else {
        // First click – start timer for single click
        this._clickTimer = setTimeout(function () {
          that._clickTimer = null;
          that.onItemSingleClick(oEvent);
        }, this._clickDelay);
      }
    },
    
    onItemSingleClick: function (oEvent) {
      var oItem = oEvent.getSource();
      // Example: select the item or highlight
      MessageToast.show("Folder Selected");
    },
    
    onItemDoubleClick: function (oEvent) {
      var oItem = oEvent.getSource();
      // Your double-click logic (e.g., navigate or open folder)
      MessageToast.show("Double Click: ");
    },

    onFolderPress: function (oEvent) {
      const oSelected = oEvent.getParameter("listItem").getBindingContext("foldersModel").getObject();
      this._loadFolderByUUID(oSelected.FolderUUID);
    },
    onFilePress1: function (oEvent) {
      let oFile = oEvent.getParameter("listItem").getBindingContext("foldersModel").getObject();
      const oView = this.getView();
      oFile.AccessPath = `/odata/v4/dms/File/${oFile.FileUUID}/FileContent`
      // Create a JSONModel for preview
      const oPreviewModel = new sap.ui.model.json.JSONModel(oFile);
      oView.setModel(oPreviewModel, "filePreview");

      // Load fragment
      if (oFile.FileType === "application/pdf") {
        var oPDFViewer = new PDFViewer();
        this.getView().addDependent(oPDFViewer);
        oPDFViewer.setSource(oFile.AccessPath);
        oPDFViewer.open();
      } else if (!this._pFilePreviewDialog) {
        this._pFilePreviewDialog = sap.ui.core.Fragment.load({
          name: "dmsui.view.fragment.FilePreview",
          controller: this
        }).then(function (oDialog) {
          oView.addDependent(oDialog);
          oDialog.open();
          return oDialog;
        });
      } else {
        this._pFilePreviewDialog.then(function (oDialog) {
          oDialog.open();
        });
      }
    },
    onCreateFolder1: function () {
      // Assume the currently selected folder UUID is stored in your view model
      const sCurrentUUID = this.getView().getModel("foldersModel").getProperty("/currentFolder");
      this.createFolder(sCurrentUUID.FolderUUID);
    },
    onCreateFolder: function () {
      if (!this._pNewFolderDialog) {
        this._pNewFolderDialog = sap.ui.core.Fragment.load({
          id: this.getView().getId(),
          name: "dmsui.view.fragment.NewFolderDialog",
          controller: this
        }).then(function (oDialog) {
          this.getView().addDependent(oDialog);
          // const oInput = this.getView().byId("folderNameInput");
          // if (oInput) {
          //   oInput.setValue("");
          // }
          oDialog.open();
          return oDialog;
        }.bind(this));
      } else {
        this._pNewFolderDialog.then(function (oDialog) {
          oDialog.open();
        });
      }
    },
    onCancelCreateFolder: function () {
      const oDialog = this.getView().byId("newFolderDialog");
      if (oDialog) {
        oDialog.close();
      }
    },

    onCreateFolderConfirm: function () {
      const oView = this.getView();
      const oModel = this.getOwnerComponent().getModel("dms");
      const oDialog = this.getView().byId("newFolderDialog");
      const sFolderName = oView.byId("folderNameInput").getValue();

      // const sParentUUID = oView.getModel("viewModel").getProperty("/currentFolderUUID");
      const sCurrentUUID = this.getView().getModel("foldersModel").getProperty("/currentFolder");
      const sParentUUID = sCurrentUUID.FolderUUID;

      const oNewFolder = {
        Name: sFolderName,
        ParentFolder_FolderUUID: sParentUUID
      };

      let oListBinding = oModel.bindList("/Folder");
      oListBinding.create(oNewFolder).created()
        .then(function () {
          // let oCreatedFolder = oCreatedContext.getObject();
          if (oDialog) {
            oDialog.close();
          }
          // 🔁 REFRESH list of folders shown in the current view
          oModel.bindContext("/Folder('" + sParentUUID + "')", undefined, {
            $expand: {
              SubFolders: {},
              AllFiles: {}
            }
          }).requestObject().then(function (oFolderData) {
            this._refreshCurrentFolder();
            // this.getView().getModel("foldersModel").setProperty("/currentFolder", oFolderData);
            // this.getView().getModel("foldersModel").refresh(true);
          }.bind(this));

        }.bind(this), 500)
        .catch(function (oError) {
          console.error("Error creating folder:", oError);
          sap.m.MessageBox.error("Failed to create folder.");
        });
    },
    onOpenUploadDialog: function () {
      if (!this._oUploadDialog) {
        this._oUploadDialog = sap.ui.core.Fragment.load({
          id: this.getView().getId(),
          name: "dmsui.view.fragment.FileUpload",
          controller: this
        }).then(function (oDialog) {
          this.getView().addDependent(oDialog);
          this.getView().byId("fileUploader").clear();
          const oInput = this.getView().byId("fileNameInput");
          if (oInput) {
            oInput.setValue("");
          }
          oDialog.open();
          return oDialog;
        }.bind(this));
      } else {
        this._oUploadDialog.then(function (oDialog) {
          this.getView().byId("fileUploader").clear();
          const oInput = this.getView().byId("fileNameInput");
          if (oInput) {
            oInput.setValue("");
          }
          oDialog.open();
        }.bind(this));
      }
    },
    onUploadConfirm: async function () {
      const oView = this.getView();
      const oModel = this.getOwnerComponent().getModel("dms");
      const oDialog = oView.byId("uploadDialog");
    
      const sFileName = oView.byId("fileNameInput").getValue();
      // const oUploader = oView.byId("fileUploader");
      // const oUploader = this.getView().byId("fileUploader");
      // const aFiles = oUploader.getFocusDomRef()?.files;

      // if (!aFiles || aFiles.length === 0) {
      //   const oFile = this._oSelectedFile;
      // }

      // oFile = aFiles[0];
      // const oFile = oUploader.getFocusDomRef().files[0];
      const oFile = this._oSelectedFile;
      const oCurrentFolder = oView.getModel("foldersModel").getProperty("/currentFolder");
      const sFolderUUID = oCurrentFolder?.FolderUUID;
    
      if (!oFile || !sFileName || !sFolderUUID) {
        sap.m.MessageBox.error("Missing required input.");
        return;
      }
    
      const oNewFile = {
        FileName: sFileName,
        FileType: oFile.type,
        FileSize: oFile.size,
        Folder_FolderUUID: sFolderUUID
      };
    
      try {
        // 1️⃣ Create metadata record
        // const oListBinding = oModel.bindList("/File");
        // const oContext = oListBinding.create(oNewFile);
        // const oCreated = await oContext.created();
        // const oCreatedData = oCreated.getObject();
        // const sFileUUID = oCreatedData.FileUUID;
        const oListBinding = oModel.bindList("/File");
        const oContext = oListBinding.create(oNewFile);

        oContext.created().then(async () => {
          console.log(oContext,"oCreated")
          const oCreatedData = oContext.getObject();
            // now you can use oCreated.FileUUID

            console.log(oCreatedData.FileUUID,"oCreatedData")
            const sUploadUrl = `/odata/v4/dms/File(${oCreatedData.FileUUID})/FileContent`;
    
            await fetch(sUploadUrl, {
              method: "PUT",
              headers: {
                "Content-Type": oFile.type
              },
              body: oFile
            });
        
            sap.m.MessageToast.show("File uploaded successfully!");
            oDialog.close();
            this._refreshCurrentFolder();
        }).catch(function (err) {
            console.error("Metadata creation failed", err);
        });
    
        // 2️⃣ Upload binary content
        // const sUploadUrl = `/odata/v4/dms/File(${sFileUUID})/FileContent`;
    
        // await fetch(sUploadUrl, {
        //   method: "PUT",
        //   headers: {
        //     "Content-Type": oFile.type
        //   },
        //   body: oFile
        // });
    
        // sap.m.MessageToast.show("File uploaded successfully!");
        // oDialog.close();
    
        // 🔁 Optionally refresh file list or folder
        // const oFolderModel = this.getView().getModel("foldersModel");
        // const oFolderUUID = oFolderModel.getProperty("/currentFolder/FolderUUID");
    
        // const oFolderContext = oModel.bindContext(`/Folder('${oFolderUUID}')`, null, {
        //   $expand: "AllFiles"
        // });
    
        // const oFolderData = await oFolderContext.requestObject();
        // oFolderModel.setProperty("/currentFolder", oFolderData);
        // oFolderModel.setProperty("/AllFiles", oFolderData.AllFiles);
        
      } catch (err) {
        console.error("Upload failed", err);
        sap.m.MessageBox.error("Upload failed.");
      }
    },
    onFileSelected: function (oEvent) {
      const oUploader = oEvent.getSource();
      const aFiles = oEvent.getParameter("files"); // SAFE way
  
      if (aFiles && aFiles.length > 0) {
          this._oSelectedFile = aFiles[0];
          const oFile = aFiles[0];
          this.getView().byId("fileNameInput").setValue(oFile.name);
      } else {
          sap.m.MessageToast.show("No file selected.");
      }
  },
  _refreshCurrentFolder: function () {
    const oModel = this.getOwnerComponent().getModel("dms");
    const oFoldersModel = this.getView().getModel("foldersModel");
    const aBreadcrumb = oFoldersModel.getProperty("/breadcrumb");
    const sFolderUUID = oFoldersModel.getProperty("/currentFolder/FolderUUID");
  
    const oListBinding = oModel.bindContext(`/Folder(${sFolderUUID})?$expand=SubFolders,AllFiles`);
    oListBinding.requestObject().then((oFolderData) => {
      oFoldersModel.setProperty("/", {
        currentFolder: oFolderData,
        currentSubFolders: oFolderData.SubFolders || [],
        currentFiles: oFolderData.AllFiles || [],
        breadcrumb: aBreadcrumb || [],
      });
    });
    oFoldersModel.refresh(true);
  },
    
    


    onCreateFolder11: function () {
      const sCurrentUUID = this.getView().getModel("foldersModel").getProperty("/currentFolder");
      const sParentFolderUUID = sCurrentUUID.FolderUUID;
      // this.createFolder(sCurrentUUID.FolderUUID);
      const oView = this.getView();
      const oModel = this.getOwnerComponent().getModel(); // OData V4 model

      // Prompt user for folder name (you can replace this with an InputDialog)
      sap.m.MessageBox.prompt("Enter folder name:", {
        title: "Create Folder",
        initialValue: "New Folder",
        actions: [sap.m.MessageBox.Action.OK, sap.m.MessageBox.Action.CANCEL],
        onClose: function (sAction, oInput) {
          if (sAction === sap.m.MessageBox.Action.OK) {
            const sFolderName = oInput.getValue();

            // Construct the folder object
            const oNewFolder = {
              Name: sFolderName,
              ParentFolder_FolderUUID: sParentFolderUUID
            };

            // Bind to Folder entity set and create entry
            oModel.bindList("/Folder").create(oNewFolder)
              .then(function (oCreatedFolder) {
                sap.m.MessageToast.show("Folder created: " + oCreatedFolder.Name);
              })
              .catch(function (oError) {
                console.error("Error creating folder:", oError);
                sap.m.MessageBox.error("Failed to create folder.");
              });
          }
        }
      });
    },

    onFilePress: function (oEvent) {
      const oView = this.getView();

      // ✅ Access CustomListItem and get file object
      let oItem = oEvent.getSource();
      let oFile = oItem.getBindingContext("foldersModel").getObject();

      if (!oFile || !oFile.FileUUID) {
        console.warn("File data missing or invalid.");
        return;
      }

      // ✅ Construct access path for content
      oFile.AccessPath = `/odata/v4/dms/File(${oFile.FileUUID})/FileContent`;

      // ✅ Set file preview model
      const oPreviewModel = new sap.ui.model.json.JSONModel(oFile);
      oView.setModel(oPreviewModel, "filePreview");

      // ✅ Handle preview logic
      if (oFile.FileType === "application/pdf") {
        const oPDFViewer = new sap.m.PDFViewer({
          source: oFile.AccessPath,
          title: oFile.FileName,
          isTrustedSource: true
        });
        oView.addDependent(oPDFViewer);
        oPDFViewer.open();

      } else {
        // Load or reuse dialog for image/text preview
        if (!this._pFilePreviewDialog) {
          this._pFilePreviewDialog = sap.ui.core.Fragment.load({
            name: "dmsui.view.fragment.FilePreview",
            controller: this
          }).then(function (oDialog) {
            oView.addDependent(oDialog);
            oDialog.open();
            return oDialog;
          });
        } else {
          this._pFilePreviewDialog.then(function (oDialog) {
            oDialog.open();
          });
        }
      }
    },


    onClosePreview: function () {
      this._pFilePreviewDialog.then(function (oDialog) {
        oDialog.close();
      });
    },
    onCloseUpload: function () {
      this._oUploadDialog.then(function (oDialog) {
        oDialog.close();
      });
    },
    onDeleteItem: function (oEvent) {
      const oModel = this.getOwnerComponent().getModel("dms");
    
      const oContext = oEvent.getSource().getBindingContext("foldersModel");
      const sPath = oContext.getPath(); // Example: /AllFiles(‘<UUID>’) or /SubFolders('<UUID>')
    
      MessageBox.confirm("Are you sure you want to delete this item?", {
        onClose: function (sAction) {
          if (sAction === MessageBox.Action.OK) {
            const oBindingContext = oModel.bindContext(sPath);
            
            oBindingContext.delete().then(() => {
              sap.m.MessageToast.show("Deleted successfully");
              this._refreshCurrentFolder(); // refresh list after deletion
            }).catch((oError) => {
              console.error("Deletion failed", oError);
              sap.m.MessageBox.error("Failed to delete item.");
            });
          }
        }.bind(this)
      });
    },
    
    onDeleteFile: function (oEvent) {
      const oModel = this.getOwnerComponent().getModel("dms");
      const oContext = oEvent.getSource().getBindingContext("foldersModel");
      
      if (!oContext) {
        sap.m.MessageBox.error("No item context available.");
        return;
      }
      
      const oData = oContext.getObject();
      let sPath = "";
      
      if (oData.FileUUID) {
        sPath = `/File('${oData.FileUUID}')`;
      } else if (oData.FolderUUID) {
        sPath = `/Folder('${oData.FolderUUID}')`;
      } else {
        sap.m.MessageBox.error("Invalid item selected.");
        return;
      }
      
      // Create binding
      const oBinding = oModel.bindList(sPath, null, { groupId: "$auto" });
      
      sap.m.MessageBox.confirm("Are you sure you want to delete this item?", {
        onClose: (sAction) => {
          if (sAction === sap.m.MessageBox.Action.OK) {
            // Resolve binding before delete
            oBinding.requestContext().then(function (oResolvedContext) {
              return oResolvedContext.delete("$auto");
            }).then(() => {
              sap.m.MessageToast.show("Item deleted successfully.");
              // Optionally refresh the model/view here
            }).catch((oError) => {
              console.error("Deletion failed:", oError);
              sap.m.MessageBox.error("Failed to delete item.");
            });
          }
        }
      });
      
    },
    onDeleteFolder: function (oEvent) {
      const oModel = this.getOwnerComponent().getModel("dms");
      const oFolder = oEvent.getSource().getBindingContext("foldersModel").getObject();
      const sFolderUUID = oFolder.FolderUUID;
    
      sap.m.MessageBox.confirm(`Are you sure you want to delete folder "${oFolder.Name}"?`, {
        onClose: function (sAction) {
          if (sAction === "OK") {
            oModel.remove(`/Folder(${sFolderUUID})`)
              .then(() => {
                sap.m.MessageToast.show("Folder deleted successfully.");
                this._refreshCurrentFolder(); // Refresh the view
              })
              .catch((err) => {
                console.error("Failed to delete folder:", err);
                sap.m.MessageBox.error("Failed to delete folder.");
              });
          }
        }.bind(this)
      });
    },
    
    


    _loadFolderByUUID: function (sUUID) {
      const oModel = this.getOwnerComponent().getModel("dms");

      const oBinding = oModel.bindContext(`/Folder('${sUUID}')`, undefined, {
        $expand: {
          SubFolders: {},
          AllFiles: {}
        }
      });

      oBinding.requestObject().then(function (oFolderData) {
        const oModelJSON = this.getView().getModel("foldersModel");
        const aBreadcrumb = oModelJSON.getProperty("/breadcrumb");
        aBreadcrumb.push(oFolderData);

        oModelJSON.setProperty("/currentFolder", oFolderData);
        oModelJSON.setProperty("/currentSubFolders", oFolderData.SubFolders || []);
        oModelJSON.setProperty("/currentFiles", oFolderData.AllFiles || []);
        oModelJSON.setProperty("/breadcrumb", aBreadcrumb);

        this._renderBreadcrumb();
      }.bind(this)).catch(function (err) {
        console.error("Folder load error", err);
      });
    },

    _renderBreadcrumb: function () {
      const oBC = this.byId("breadcrumb");
      const oModel = this.getView().getModel("foldersModel");
      const aCrumbs = oModel.getProperty("/breadcrumb");

      oBC.removeAllLinks();

      aCrumbs.forEach(function (oFolder, index) {
        oBC.addLink(new Link({
          text: oFolder.Name,
          press: function () {
            const aNewBC = aCrumbs.slice(0, index + 1);
            oModel.setProperty("/breadcrumb", aNewBC);
            oModel.setProperty("/currentFolder", oFolder);
            oModel.setProperty("/currentSubFolders", oFolder.SubFolders || []);
            oModel.setProperty("/currentFiles", oFolder.AllFiles || []);
            this._renderBreadcrumb();
          }.bind(this)
        }));
      }.bind(this));
    }
  });
});
