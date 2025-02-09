async function requestStorage() {
  if (document.hasStorageAccess) {
    const hasAccess = await document.hasStorageAccess();
    if (!hasAccess) {
      console.warn("🚫 No IndexedDB access in iframe. Redirecting...");
      window.location.href = "https://local.cache.com:8081/grant-access.html";
      return;
    }
    console.log("✅ IndexedDB access confirmed.");
  }
}

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("CrossDomainCacheDB", 1);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains("cacheStore")) {
        db.createObjectStore("cacheStore", { keyPath: "key" });
      }
    };
    request.onsuccess = (event) => resolve(event.target.result);
    request.onerror = (event) => reject(event.target.error);
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
  const { action, key, value } = event.data;
  if (action === "set") {
    await setIndexedDB(key, value);
  } else if (action === "get") {
    const storedValue = await getIndexedDB(key);
    event.source.postMessage({ key, value: storedValue }, event.origin);
  }
});

requestStorage();
