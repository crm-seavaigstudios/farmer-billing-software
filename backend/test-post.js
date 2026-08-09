const fetch = require('node-fetch');

async function testPost() {
  const payload = {
    name: "Test Farmer",
    grade: "A_GRADE",
    village: "Test Village",
    taluka: "Test Taluka",
    district: "Test District",
    phone: "9999999999",
    status: "ACTIVE",
    aadhaarNumber: "",
    bankName: "",
    accountNumber: "",
    ifscCode: ""
  };

  const res = await fetch('http://localhost:4000/api/farmers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const text = await res.text();
  console.log("Status:", res.status);
  console.log("Response:", text);
}

testPost();
