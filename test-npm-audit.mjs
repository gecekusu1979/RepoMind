const req = async () => {
    try {
        const res = await fetch("https://registry.npmjs.org/-/npm/v1/security/advisories/bulk", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ lodash: ["4.17.11"], request: ["2.88.0"] })
        });
        const data = await res.json();
        console.log(JSON.stringify(data, null, 2));
    } catch (e) {
        console.error(e);
    }
};
req();
