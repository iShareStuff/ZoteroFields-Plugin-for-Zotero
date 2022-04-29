zoteroifinitPreferences = function () {
  var zoteroifbysharestuff_url =
    Zotero.zoteroifbysharestuff.zoteroifbysharestuff_url();
  var automatic_updateif_sharestuff_bool =
    Zotero.zoteroifbysharestuff.automatic_updateif_sharestuff();

  // Apply setting to
  document.getElementById(
    "id-zoteroifbysharestuff-automatic-pdf-download"
  ).checked = automatic_updateif_sharestuff_bool;
  document.getElementById(
    "id-zoteroifbysharestuff-zoteroifbysharestuff-url"
  ).value = zoteroifbysharestuff_url;
};

Zotero.zoteroifbysharestuff = {
  zoteroifbysharestuff_url: function () {
    // Set default if not set.
    if (
      Zotero.Prefs.get("zoteroifbysharestuff.zoteroifbysharestuff_url") ===
      undefined
    ) {
      Zotero.Prefs.set(
        "zoteroifbysharestuff.zoteroifbysharestuff_url",
        "C:/a.csv"
      );
    }
    return Zotero.Prefs.get("zoteroifbysharestuff.zoteroifbysharestuff_url");
  },
  automatic_updateif_sharestuff: function () {
    // Set default if not set.
    if (
      Zotero.Prefs.get("zoteroifbysharestuff.automatic_updateif_sharestuff") ===
      undefined
    ) {
      Zotero.Prefs.set(
        "zoteroifbysharestuff.automatic_updateif_sharestuff",
        true
      );
    }
    return Zotero.Prefs.get(
      "zoteroifbysharestuff.automatic_updateif_sharestuff"
    );
  },
  init: function () {
    Zotero.zoteroifbysharestuff.resetState();
    Zotero.zoteroifbysharestuff.zoteroifbysharestuff_url();
    Zotero.zoteroifbysharestuff.automatic_updateif_sharestuff();

    // Register the callback in Zotero as an item observer
    var notifierID = Zotero.Notifier.registerObserver(
      Zotero.zoteroifbysharestuff.notifierCallback,
      ["item"]
    );

    // Unregister callback when the window closes (important to avoid a memory leak)
    window.addEventListener(
      "unload",
      function (e) {
        Zotero.Notifier.unregisterObserver(notifierID);
      },
      false
    );
  },
  notifierCallback: {
    // Adds pdfs when new item is added to zotero.
    notify: function (event, type, ids, extraData) {
      automatic_updateif_sharestuff_bool = Zotero.Prefs.get(
        "zoteroifbysharestuff.automatic_updateif_sharestuff"
      );
      if (
        event == "add" &&
        !(automatic_updateif_sharestuff_bool === undefined) &&
        automatic_updateif_sharestuff_bool == true
      ) {
        suppress_warningsif = true;
        Zotero.zoteroifbysharestuff.updateItems(
          Zotero.Items.get(ids),
          suppress_warningsif
        );
      }
    },
  },
  resetState: function () {
    // Reset state for updating items.
    Zotero.zoteroifbysharestuff.currentif = -1;
    Zotero.zoteroifbysharestuff.toUpdateif = 0;
    Zotero.zoteroifbysharestuff.itemsToUpdateif = null;
    Zotero.zoteroifbysharestuff.numberOfUpdatedItemsif = 0;
  },
  updateSelectedEntity: function (libraryId) {
    Zotero.debug("Updating items in entity");
    if (!ZoteroPane.canEdit()) {
      ZoteroPane.displayCannotEditLibraryMessage();
      return;
    }

    var collection = ZoteroPane.getSelectedCollection(false);

    if (collection) {
      Zotero.debug("Updating items in entity: Is a collection == true");
      var items = [];
      collection.getChildItems(false, false).forEach(function (item) {
        items.push(item);
      });
      suppress_warningsif = true;
      Zotero.zoteroifbysharestuff.updateItems(items, suppress_warningsif);
    }
  },
  updateSelectedItems: function () {
    Zotero.debug("Updating Selected items");
    suppress_warningsif = false;
    Zotero.zoteroifbysharestuff.updateItems(
      ZoteroPane.getSelectedItems(),
      suppress_warningsif
    );
  },
  updateAll: function () {
    Zotero.debug("Updating all items in Zotero");
    var items = [];

    // Get all items
    Zotero.Items.getAll().then(function (items) {
      // Once we have all items, make sure it's a regular item.
      // And that the library is editable
      // Then add that item to our list.
      items.map(function (item) {
        if (item.isRegularItem() && !item.isCollection()) {
          var libraryId = item.getField("libraryID");
          if (
            libraryId == null ||
            libraryId == "" ||
            Zotero.Libraries.isEditable(libraryId)
          ) {
            items.push(item);
          }
        }
      });
    });

    // Update all of our items with pdfs.
    suppress_warningsif = true;
    Zotero.zoteroifbysharestuff.updateItems(items, suppress_warningsif);
  },
  updateItems: function (items, suppress_warningsif) {
    // If we don't have any items to update, just return.
    if (
      items.length == 0 ||
      Zotero.zoteroifbysharestuff.numberOfUpdatedItemsif <
        Zotero.zoteroifbysharestuff.toUpdateif
    ) {
      return;
    }

    // Reset our state and figure out how many items we have to update.
    Zotero.zoteroifbysharestuff.resetState();
    Zotero.zoteroifbysharestuff.toUpdateif = items.length;
    Zotero.zoteroifbysharestuff.itemsToUpdateif = items;
    // Iterate through our items, updating each one with a pdf.
    suppress_warningsif = true;
    Zotero.zoteroifbysharestuff.updateNextItem(suppress_warningsif);
    //Zotero.zoteroifbysharestuff.updateNextItem();
  },
  showPopUP: function (alertInfo, otherinfo) {
    var progressWindow = new Zotero.ProgressWindow({ closeOnClick: true });
    progressWindow.changeHeadline(otherinfo);
    progressWindow.addDescription(alertInfo);
    progressWindow.show();
    progressWindow.startCloseTimer(2000);
  },
  updateNextItem: function (suppress_warningsif) {
    Zotero.zoteroifbysharestuff.numberOfUpdatedItemsif++;

    // If we have updated all of our items, reset our state and return.
    if (
      Zotero.zoteroifbysharestuff.currentif ==
      Zotero.zoteroifbysharestuff.toUpdateif - 1
    ) {
      Zotero.zoteroifbysharestuff.resetState();
      return;
    }

    // Update a single item with a pdf.
    Zotero.zoteroifbysharestuff.currentif++;
    Zotero.zoteroifbysharestuff.updateItem(
      Zotero.zoteroifbysharestuff.itemsToUpdateif[
        Zotero.zoteroifbysharestuff.currentif
      ],
      suppress_warningsif
    );
    Zotero.zoteroifbysharestuff.updateNextItem(suppress_warningsif);
  },
  generateItemUrl: function (item) {
    var baseURL = item.getField("publicationTitle");
    var url = baseURL;
    return url;
  },
  generateItemSUrl: function (item) {
    var baseURL = item.getField("university");
    var url = baseURL;
    return url;
  },
  updateItem: async function (item, suppress_warningsif) {
    Zotero.debug("Suppress: " + suppress_warningsif);
    var url = Zotero.zoteroifbysharestuff.generateItemUrl(item);
    var url = url.toUpperCase().replace(/\./g, "");
    var url = url.replace(/\s*/g, "");
    var urlS = Zotero.zoteroifbysharestuff.generateItemSUrl(item);
    var urlS = urlS.toUpperCase().replace(/\./g, "");
    var urlS = urlS.replace(/\s*/g, "");
    if (url != "" || urlS != "") {
      //read csv
      var csvpath = Zotero.Prefs.get(
        "zoteroifbysharestuff.zoteroifbysharestuff_url"
      );
      //if (itemTypes=="thesis")
      if (urlS != "") {
        //对象变string JSON.stringify(dataj)
        //string变对象 JSON.parse(pingan);
        //学位信息
        var Sjsonpath = csvpath.replace(".csv", "S.json");
        if (await OS.File.exists(Sjsonpath)) {
          //读取本地文件
          var data_S = await Zotero.File.getContentsAsync(Sjsonpath);
          //object dataS
          var dataS = JSON.parse(data_S);
        } else {
          //学位论文地点信息
          var data = await Zotero.File.getContentsAsync(
            csvpath,
            (encoding = "gbk")
          );
          var csv = data.split(/\n/);
          var schoolA = new Map();
          var numP = 3200; //行数较少
          for (i = 0; i < numP; i++) {
            try {
              var entries = csv[i].split(/,/);
              if (entries[8] !== "" && entries[9] !== "") {
                var name = entries[8].toUpperCase().replace(/\./g, "");
                var name = name.replace(/\s*/g, "");
                var numb = entries[9];
                schoolA[name] = numb;
              }
            } catch (e) {
              console.log(e);
            }
          }
          var dataS = schoolA;
          if (typeof dataS === "object") {
            dataSJson = JSON.stringify(dataS);
            await Zotero.File.putContentsAsync(Sjsonpath, dataSJson);
          }
        }
        //write palce in series
        var fieldName = "place";
        var newValue = "";
        var fieldID = Zotero.ItemFields.getID(fieldName);

        let mappedFieldIDS = Zotero.ItemFields.getFieldIDFromTypeAndBase(
          item.itemTypeID,
          fieldName
        );
        var IFS = dataS[urlS];
        item.setField(mappedFieldIDS ? mappedFieldIDS : fieldID, newValue);

        if (IFS != undefined) {
          item.setField("place", IFS);
          alertInfo = "The item has update place with the value:  \n";
          Zotero.zoteroifbysharestuff.showPopUP(String(IFS), alertInfo);
          //alert("The item has update IF with the value:  "+IF)
          await item.save();
        }
      }
      //if (itemTypes!="thesis") is journal
      if (url != "") {
        //期刊论文信息
        var Jjsonpath = csvpath.replace(".csv", "J.json");
        if (await OS.File.exists(Jjsonpath)) {
          //读取本地文件
          var data_J = await Zotero.File.getContentsAsync(Jjsonpath);
          //object dataJ
          var dataJ = JSON.parse(data_J);
        } else {
          var data = await Zotero.File.getContentsAsync(
            csvpath,
            (encoding = "gbk")
          );
          var csv = data.split(/\n/);
          var journals = new Map();
          var numP = csv.length;
          for (i = 0; i < numP; i++) {
            try {
              var entries = csv[i].split(/,/);
              if (entries[0] !== "" && entries[2] !== "") {
                var name = entries[0].toUpperCase().replace(/\./g, "");
                var name = name.replace(/\s*/g, "");
                var numb = entries[2] + entries[3] + entries[4] + entries[5];
                journals[name] = numb;
              }
              if (entries[1] !== "" && entries[2] !== "") {
                var name = entries[1].toUpperCase().replace(/\./g, "");
                var name = name.replace(/\s*/g, "");
                var numb = entries[2] + entries[3] + entries[4] + entries[5];
                journals[name] = numb;
              }
            } catch (e) {
              console.log(e);
            }
          }
          var dataJ = journals;

          if (typeof dataJ === "object") {
            dataJJson = JSON.stringify(dataJ);
            await Zotero.File.putContentsAsync(Jjsonpath, dataJJson);
          }
        }

        //计算
        //write if in series
        var fieldName = "series";
        var newValue = "";
        var fieldID = Zotero.ItemFields.getID(fieldName);

        let mappedFieldID = Zotero.ItemFields.getFieldIDFromTypeAndBase(
          item.itemTypeID,
          fieldName
        );
        var IF = dataJ[url];
        item.setField(mappedFieldID ? mappedFieldID : fieldID, newValue);

        if (IF != undefined) {
          item.setField("series", IF);
          alertInfo = "The item has update IF with the value:  \n";
          Zotero.zoteroifbysharestuff.showPopUP(String(IF), alertInfo);
          //alert("The item has update IF with the value:  "+IF)
          await item.save();
        } else {
          alertInfo =
            "The journal name of this item do not find in the csv file\n";
          details = "please check the journal name in item or csv file";
          Zotero.zoteroifbysharestuff.showPopUP(details, alertInfo);
          //alert("The journal name of this item do not find in the csv file, please check the journal name in item or csv file")
        }
      }
    } else {
      alertInfo = "The item do not have the journal name or university name\n";
      details = "you need to add it";
      Zotero.zoteroifbysharestuff.showPopUP(details, alertInfo);
      //alert("The item do not have the journal name, you need to add it")
    }
    //Zotero.zoteroifbysharestuff.updateNextItem();
  },
};

window.addEventListener(
  "load",
  function (e) {
    Zotero.zoteroifbysharestuff.init();
  },
  false
);
