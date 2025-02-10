async function requestStorage() {
  if (document.requestStorageAccess) {
    try {
      await document.requestStorageAccess();
      console.log("Storage access granted!");
    } catch (error) {
      console.warn("Storage access denied:", error);
    }
  } else {
    console.log("Storage Access API not needed in this browser.");
  }
}

async function checkStoragePermission() {
  if (document.hasStorageAccess) {
    const hasAccess = await document.hasStorageAccess();
    if (!hasAccess) {
      console.warn("No IndexedDB access in iframe. Requesting...");
      return;
    }
    console.log("IndexedDB access confirmed.");
  }
}

// Call checkStoragePermission() automatically
checkStoragePermission();

// IndexedDB functions
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("CrossDomainCacheDB", 1);

    request.onupgradeneeded = () => {
      console.log("Upgrading IndexedDB: Creating object store...");
      const db = request.result;
      if (!db.objectStoreNames.contains("cacheStore")) {
        db.createObjectStore("cacheStore", { keyPath: "key" });
      }
    };

    request.onsuccess = () => {
      console.log("IndexedDB opened successfully!");
      resolve(request.result);
    };

    request.onerror = () => {
      console.error("IndexedDB Error:", request.error);
      reject(request.error);
    };
  });
}

async function setIndexedDB(key, value) {
  const db = await openDB();
  const transaction = db.transaction("cacheStore", "readwrite");
  const store = transaction.objectStore("cacheStore");
  store.put({ key, value });
}

async function getIndexedDB(key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("cacheStore", "readonly");
    const store = transaction.objectStore("cacheStore");
    const request = store.get(key);

    request.onsuccess = () => resolve(request.result ? request.result.value : null);
    request.onerror = () => reject(request.error);
  });
}

window.addEventListener("message", async (event) => {
  if (!event.origin.endsWith(".cache.com:8082") && !event.origin.endsWith(".cache.com:8083")) {
    return;
  }

  const { action, key, value } = event.data;

  if (action === "set") {
    await setIndexedDB(key, value);
    event.source?.postMessage({ key, value: null }, event.origin);
  } else if (action === "get") {
    const storedValue = await getIndexedDB(key);
    event.source?.postMessage({ key, value: storedValue }, event.origin);
  }
});
