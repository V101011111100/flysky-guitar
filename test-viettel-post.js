/**
 * Viettel Post API Test Script
 * Hướng dẫn: Trước khi chạy, cập nhật thông tin sau:
 * - VIETTEL_USERNAME, VIETTEL_PASSWORD, hoặc TOKEN (nếu đã có)
 * - VIETTEL_CUSTOMER_ID
 * - VIETTEL_UPDATE_ORDER_TYPE, VIETTEL_UPDATE_ORDER_NOTE (tuỳ chọn)
 */

const VIETTEL_API_URL = "https://partner.viettelpost.vn/v2";

// ===== GIÁ TRỊ CẤU HÌNH =====
const CONFIG = {
  username: process.env.VIETTEL_USERNAME || "",
  password: process.env.VIETTEL_PASSWORD || "",
  customer_id: process.env.VIETTEL_CUSTOMER_ID || "",
  token: process.env.VIETTEL_TOKEN || "",
  update_order_type: Number(process.env.VIETTEL_UPDATE_ORDER_TYPE || 1),
  update_order_note: process.env.VIETTEL_UPDATE_ORDER_NOTE || "Ghi chu test tu script",
  print_type: Number(process.env.VIETTEL_PRINT_TYPE || 1),
  print_token: process.env.VIETTEL_PRINT_TOKEN || "",
  register_hook_message: process.env.VIETTEL_REGISTER_HOOK_MESSAGE || "Re-sync order journey from test script",
  enable_legacy_status_test: String(process.env.VIETTEL_ENABLE_LEGACY_STATUS_TEST || "false").toLowerCase() === "true",
};

const PRICE_SAMPLE = {
  PRODUCT_TYPE: "HH",
  PRODUCT_WEIGHT: 2500,
  PRODUCT_PRICE: 2150000,
  MONEY_COLLECTION: 2292764,
  ORDER_SERVICE: "",
  ORDER_SERVICE_ADD: "",
  SENDER_PROVINCE: 1,
  SENDER_DISTRICT: 4,
  RECEIVER_PROVINCE: 2,
  RECEIVER_DISTRICT: 43,
  PRODUCT_LENGTH: 38,
  PRODUCT_WIDTH: 24,
  PRODUCT_HEIGHT: 25,
};

const STATUS_GROUPS = {
  "-100": "Not approved",
  "100": "Approved",
  "102": "Approved",
  "103": "Approved",
  "104": "Approved",
  "-108": "Approved",
  "-109": "Sent at convenience store",
  "-110": "Sent at convenience store",
  "107": "Canceled",
  "201": "Canceled",
  "105": "Has taken the goods",
  "200": "Being transported",
  "202": "Being transported",
  "300": "Being transported",
  "320": "Being transported",
  "400": "Being transported",
  "500": "On delivery",
  "506": "On delivery",
  "570": "On delivery",
  "508": "On delivery",
  "509": "On delivery",
  "550": "On delivery",
  "507": "Delivery failed",
  "505": "Wait for approval to return",
  "502": "Approval to return",
  "515": "Approval to return",
  "503": "Successful delivery destroyed",
  "504": "Successful return",
  "501": "Successful delivery",
};

const STATUS_DETAILS = {
  "-100": "New order created, not approved",
  "-108": "Orders sent at the post office",
  "-109": "Orders have been sent at collection points",
  "-110": "Orders are handed over by post office",
  "100": "Receiving customer's order",
  "101": "ViettelPost requested customer cancel order",
  "102": "Order on processing",
  "103": "Deliver to Post Office while processing order",
  "104": "Deliver to receiver postman",
  "105": "Postman received order",
  "106": "Partner requested recuperate order",
  "107": "Partner requested cancel order via API",
  "200": "Received from postman at receiving post office",
  "201": "Cancel key in delivery note",
  "202": "Correct delivery note",
  "300": "Close delivery file",
  "400": "Receiving income file",
  "500": "Deliver to delivery postman",
  "501": "Successful delivery",
  "502": "Delivering back to receiver post office",
  "503": "Canceled by customer requirement",
  "504": "Successful return to customer",
  "505": "Inventory while returning to receiver post office",
  "506": "Inventory, customer unavailable",
  "507": "Customer picks up at post office",
  "508": "Delivering",
  "509": "Delivering to other post office",
  "510": "Cancel delivering",
  "515": "Return order approval at post office",
  "550": "Request re-send from post office",
  "570": "On delivery",
};

// ===== HELPER FUNCTIONS =====
async function viettelRequest(endpoint, method = "GET", body = null, token) {
  const headers = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
    headers["token"] = token; // Header thứ 2 để chắc chắn
  }

  const options = {
    method,
    headers,
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(`${VIETTEL_API_URL}${endpoint}`, options);
    const contentType = response.headers.get("content-type");
    
    let data;
    if (contentType && contentType.includes("application/json")) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    return {
      status: response.status,
      success: response.ok,
      contentType,
      data,
      headers: Object.fromEntries(response.headers.entries()),
    };
  } catch (error) {
    return {
      status: 0,
      success: false,
      error: error.message,
    };
  }
}

async function printResult(testName, result) {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`📋 TEST: ${testName}`);
  console.log(`${"=".repeat(60)}`);
  console.log(`Status: ${result.status}`);
  console.log(`Success: ${result.success ? "✅ YES" : "❌ NO"}`);
  if (result.error) {
    console.log(`Error: ${result.error}`);
  }
  console.log(`Response:`, JSON.stringify(result.data, null, 2));
}

function resolveDataArray(payload) {
  if (Array.isArray(payload?.data)) {
    return payload.data;
  }
  if (Array.isArray(payload?.data?.data)) {
    return payload.data.data;
  }
  return [];
}

function extractOrderNumber(payload) {
  return (
    payload?.data?.ORDER_NUMBER ||
    payload?.data?.orderNumber ||
    payload?.data?.data?.ORDER_NUMBER ||
    payload?.data?.data?.orderNumber ||
    ""
  );
}

function extractServiceCodeFromPriceAll(result) {
  const rawData = result?.data;
  const services = Array.isArray(rawData)
    ? rawData
    : resolveDataArray(rawData);
  if (!services.length) {
    return "";
  }

  const firstService = services[0] || {};
  return firstService.MA_DV_CHINH || firstService.ORDER_SERVICE || "";
}

function describeStatus(statusCode) {
  const normalized = String(statusCode || "");
  return {
    group: STATUS_GROUPS[normalized] || "Unknown",
    detail: STATUS_DETAILS[normalized] || "Unknown status code",
  };
}

function printStatusMeaning(statusCode) {
  if (statusCode === undefined || statusCode === null || statusCode === "") {
    return;
  }

  const normalized = String(statusCode);
  const description = describeStatus(normalized);
  console.log(`  - Status code: ${normalized}`);
  console.log(`  - Status group: ${description.group}`);
  console.log(`  - Status detail: ${description.detail}`);
}

// ===== TEST 1: LOGIN (LẤY TOKEN) =====
async function testLogin() {
  const loginBody = {
    USERNAME: CONFIG.username,
    PASSWORD: CONFIG.password,
  };

  const result = await viettelRequest("/user/Login", "POST", loginBody);
  await printResult("Login & Get Token", result);

  if (result.success && result.data.data && result.data.data.token) {
    CONFIG.token = result.data.data.token;
    console.log(`\n✅ Token obtained: ${CONFIG.token.substring(0, 20)}...`);
    return true;
  }
  return false;
}

// ===== TEST 2: LẤY DANH SÁCH BƯU CỤC =====
async function testGetProvinces() {
  // Endpoint đúng theo docs user cung cấp
  const result = await viettelRequest(
    "/categories/listBuuCucVTP",
    "GET",
    null,
    CONFIG.token
  );
  await printResult("Get Buu Cuc List", result);

  if (result.success && result.data.data && Array.isArray(result.data.data)) {
    console.log(`\n✅ Found ${result.data.data.length} provinces`);
    const samples = result.data.data.slice(0, 3);
    if (samples.length > 0) {
      console.log(
        `Sample: ${samples.map((p) => p.TEN_TINH || p.PROVINCE_NAME || "N/A").join(", ")}`
      );
    }
  }
}

// ===== TEST 3: LẤY THÔNG TIN TỈNH THEO ID =====
async function testGetProvinceById(provinceId = -1) {
  const result = await viettelRequest(
    `/categories/listProvinceById?provinceId=${provinceId}`,
    "GET",
    null,
    CONFIG.token
  );
  await printResult(`Get Province By ID (provinceId=${provinceId})`, result);

  if (result.success && result.data.data) {
    console.log("\n✅ Province lookup returned data");
  }
}

// ===== TEST 3B: LẤY DANH SÁCH QUẬN/HUYỆN =====
async function testGetDistricts(provinceId) {
  if (!provinceId && provinceId !== 0) {
    console.log("\n⚠️  provinceId is empty, skipping district list");
    return [];
  }

  const result = await viettelRequest(
    `/categories/listDistrict?provinceId=${provinceId}`,
    "GET",
    null,
    CONFIG.token
  );
  await printResult(`Get Districts (provinceId=${provinceId})`, result);

  const districts = resolveDataArray(result.data);
  if (result.success && districts.length > 0) {
    console.log(`\n✅ Found ${districts.length} districts`);
  }
  return districts;
}

// ===== TEST 3C: LẤY DANH SÁCH PHƯỜNG/XÃ =====
async function testGetWards(districtId) {
  if (!districtId && districtId !== 0) {
    console.log("\n⚠️  districtId is empty, skipping wards list");
    return [];
  }

  const result = await viettelRequest(
    `/categories/listWards?districtId=${districtId}`,
    "GET",
    null,
    CONFIG.token
  );
  await printResult(`Get Wards (districtId=${districtId})`, result);

  const wards = resolveDataArray(result.data);
  if (result.success && wards.length > 0) {
    console.log(`\n✅ Found ${wards.length} wards`);
  }
  return wards;
}

// ===== TEST 4: LẤY DANH SÁCH DỊCH VỤ =====
async function testGetServices() {
  const result = await viettelRequest(
    "/categories/listService",
    "POST",
    null,
    CONFIG.token
  );
  await printResult("Get Services List", result);

  if (result.success && result.data.data && Array.isArray(result.data.data)) {
    console.log(`\n✅ Found ${result.data.data.length} services`);
  }
}

// ===== TEST 5: LẤY DỊCH VỤ CỘNG THÊM =====
async function testGetServiceExtra(serviceCode = "") {
  const result = await viettelRequest(
    `/categories/listServiceExtra?serviceCode=${encodeURIComponent(serviceCode)}`,
    "GET",
    null,
    CONFIG.token
  );
  await printResult(`Get Service Extra (serviceCode=${serviceCode || ""})`, result);

  if (result.success && result.data.data) {
    console.log("\n✅ Service extra endpoint responded");
  }
}

// ===== TEST 5B: LẤY PHÍ SHIP (getPrice) =====
async function testGetPrice(body) {
  const result = await viettelRequest(
    "/order/getPrice",
    "POST",
    body,
    CONFIG.token
  );
  await printResult("Get Price", result);
  return result;
}

// ===== TEST 5C: LẤY PHÍ SHIP (getPriceAll) =====
async function testGetPriceAll(body) {
  const result = await viettelRequest(
    "/order/getPriceAll",
    "POST",
    body,
    CONFIG.token
  );
  await printResult("Get Price All", result);
  return result;
}

// ===== TEST 5D: LẤY PHÍ SHIP NLP (getPriceNlp) =====
async function testGetPriceNlp(body) {
  const result = await viettelRequest(
    "/order/getPriceNlp",
    "POST",
    body,
    CONFIG.token
  );
  await printResult("Get Price NLP", result);
  return result;
}

// ===== TEST 5E: LẤY PHÍ SHIP NLP (getPriceAllNlp) =====
async function testGetPriceAllNlp(body) {
  const result = await viettelRequest(
    "/order/getPriceAllNlp",
    "POST",
    body,
    CONFIG.token
  );
  await printResult("Get Price All NLP", result);
  return result;
}

// ===== TEST 6: TẠO VẬN ĐƠN TEST =====
async function testCreateOrder(inventoryLocation, orderService = "", route = {}) {
  const senderProvince = route.SENDER_PROVINCE || inventoryLocation?.provinceId || 1;
  const senderDistrict = route.SENDER_DISTRICT || inventoryLocation?.districtId || 1;
  const senderWard = route.SENDER_WARD || inventoryLocation?.wardsId || 1;
  const receiverProvince = route.RECEIVER_PROVINCE || 2;
  const receiverDistrict = route.RECEIVER_DISTRICT || 43;
  const receiverWard = route.RECEIVER_WARD || 0;
  const senderAddress = route.SENDER_ADDRESS || inventoryLocation?.address || "So 5A ngach 22 ngo 282 Kim Giang, Dai Kim, Hoang Mai, Ha Noi";
  const senderName = inventoryLocation?.name || "FlySky Test";
  const senderPhone = inventoryLocation?.phone || CONFIG.username;
  const groupAddressId = inventoryLocation?.groupaddressId || Number(CONFIG.customer_id) || 0;
  const receiverAddress = route.RECEIVER_ADDRESS || "1 NKKN P.Nguyen Thai Binh, Quan 1, TP Ho Chi Minh";

  const orderBody = {
    ORDER_NUMBER: `TEST-${Date.now()}`,
    GROUPADDRESS_ID: groupAddressId,
    SENDER_FULLNAME: senderName,
    SENDER_ADDRESS: senderAddress,
    SENDER_PHONE: senderPhone,
    SENDER_EMAIL: "test@flysky.com",
    SENDER_WARD: senderWard,
    SENDER_DISTRICT: senderDistrict,
    SENDER_PROVINCE: senderProvince,
    RECEIVER_FULLNAME: "Customer Test",
    RECEIVER_ADDRESS: receiverAddress,
    RECEIVER_PHONE: "0961234567",
    RECEIVER_EMAIL: "customer@test.com",
    // Dung cung cap hanh chinh voi dia chi hop le de test ket noi API
    RECEIVER_WARD: receiverWard,
    RECEIVER_DISTRICT: receiverDistrict,
    RECEIVER_PROVINCE: receiverProvince,
    PRODUCT_NAME: "Guitar String",
    PRODUCT_TYPE: "HH",
    PRODUCT_PRICE: 50000,
    PRODUCT_WEIGHT: 0.5,
    CONTENT: "Test Order - Guitar",
    ORDER_SERVICE: orderService,
    ORDER_PAYMENT: 1, // 1=Bên gửi thanh toán, 0=Bên nhận thanh toán
  };

  const result = await viettelRequest(
    "/order/createOrder",
    "POST",
    orderBody,
    CONFIG.token
  );
  await printResult("Create Order (Test)", result);

  if (result.success && result.data.data && result.data.data.ORDER_NUMBER) {
    console.log(`\n✅ Order created: ${result.data.data.ORDER_NUMBER}`);
    console.log(`📦 Tracking Number: ${result.data.data.ORDER_NUMBER}`);
    console.log(`💰 Total Fee: ${result.data.data.MONEY_TOTAL}`);
    return result.data.data.ORDER_NUMBER;
  }

  return "";
}

// ===== TEST 7B: CẬP NHẬT TRẠNG THÁI VẬN ĐƠN =====
async function testUpdateOrder(orderNumber) {
  if (!orderNumber) {
    console.log("\n⚠️  Order number not provided, skipping update order");
    return;
  }

  // Observed on this account: TYPE=1 approve, TYPE=4 cancel, TYPE=5 resend.
  const updateBody = {
    TYPE: CONFIG.update_order_type,
    ORDER_NUMBER: orderNumber,
    NOTE: CONFIG.update_order_note,
  };

  const result = await viettelRequest(
    "/order/UpdateOrder",
    "POST",
    updateBody,
    CONFIG.token
  );
  await printResult(`Update Order Status: ${orderNumber}`, result);

  if (result.success && result.data?.error === false) {
    console.log(`\n✅ UpdateOrder accepted with TYPE=${CONFIG.update_order_type}`);
  }
}

// ===== TEST 7C: LẤY LINK IN VẬN ĐƠN =====
async function testEncryptLinkPrint(orderNumber) {
  if (!orderNumber) {
    console.log("\n⚠️  Order number not provided, skipping encryptLinkPrint");
    return null;
  }

  if (!CONFIG.print_token) {
    console.log("\n⚠️  VIETTEL_PRINT_TOKEN is empty, skipping encryptLinkPrint");
    return null;
  }

  const expiryTime = Date.now() + 60 * 60 * 1000;
  const body = {
    TYPE: CONFIG.print_type,
    ORDER_ARRAY: [orderNumber],
    EXPIRY_TIME: expiryTime,
    PRINT_TOKEN: CONFIG.print_token,
  };

  const result = await viettelRequest(
    "/order/encryptLinkPrint",
    "POST",
    body,
    CONFIG.token
  );
  await printResult(`Encrypt Link Print: ${orderNumber}`, result);

  if (result.success && result.data?.message) {
    console.log(`\n✅ Print link: ${result.data.message}`);
  }

  return result;
}

// ===== TEST 7D: ĐĂNG KÝ PUSH LẠI HÀNH TRÌNH =====
async function testRegisterOrderHook(orderNumber) {
  if (!orderNumber) {
    console.log("\n⚠️  Order number not provided, skipping registerOrderHook");
    return null;
  }

  const url = `${VIETTEL_API_URL}/order/registerOrderHook?oid=${encodeURIComponent(orderNumber)}&mes=${encodeURIComponent(CONFIG.register_hook_message)}`;
  let result;

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        token: CONFIG.token,
        Authorization: `Bearer ${CONFIG.token}`,
      },
      redirect: "manual",
    });

    const location = response.headers.get("location") || "";
    let data;
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    result = {
      status: response.status,
      success: response.ok,
      contentType,
      data,
      headers: Object.fromEntries(response.headers.entries()),
      location,
    };

    if (response.status >= 300 && response.status < 400 && location === url) {
      result.success = false;
      result.data = {
        error: true,
        message: "registerOrderHook is self-redirecting on this account/endpoint",
        location,
      };
    }
  } catch (error) {
    result = {
      status: 0,
      success: false,
      error: error.message,
    };
  }

  await printResult(`Register Order Hook: ${orderNumber}`, result);

  if (result.success && result.data?.error === false) {
    console.log("\n✅ Requested Viettel to push the full order journey back via webhook");
  } else if (result.location === url) {
    console.log("\n⚠️  registerOrderHook is redirecting back to itself. This looks like a Viettel endpoint/account issue, not a payload issue.");
  }

  return result;
}

// ===== TEST 7: LẤY DANH SÁCH KHO/LẤY HÀNG =====
async function testGetOrderList() {
  const result = await viettelRequest(
    "/user/listInventory",
    "GET",
    null,
    CONFIG.token
  );
  await printResult("Get Order List (Inventory)", result);

  if (result.success && result.data.data) {
    console.log(`\n✅ Found ${result.data.data.length} locations/groups`);
    if (result.data.data.length > 0) {
      console.log(
        `Sample: ${result.data.data[0].name} (ID: ${result.data.data[0].groupaddressId})`
      );
      return result.data.data[0];
    }
  }

  return null;
}

// ===== TEST 8: KIỂM TRA TRẠNG THÁI VẬN ĐƠN =====
async function testGetOrderStatus(orderNumber) {
  if (!orderNumber) {
    console.log("\n⚠️  Order number not provided, skipping status check");
    return;
  }

  const result = await viettelRequest(
    `/order/getOrderStatus?orderNumber=${encodeURIComponent(orderNumber)}`,
    "GET",
    null,
    CONFIG.token
  );
  await printResult(`Get Order Status: ${orderNumber}`, result);

  if (result.status === 405) {
    console.log("\n⚠️  getOrderStatus is not enabled for this Viettel endpoint/account. UpdateOrder is working, but order-status lookup needs a different endpoint from Viettel support/docs.");
    return;
  }

  if (result.success && result.data.data) {
    console.log(`\n✅ Status retrieved`);
    printStatusMeaning(result.data.data.STATUS);
    console.log(`  - Updated: ${result.data.data.UPDATE_DATE || "N/A"}`);
  }
}

// ===== MAIN TEST FLOW =====
async function runAllTests() {
  console.log(`
╔══════════════════════════════════════════════════════════╗
║     VIETTEL POST API - COMPLETE TEST SUITE               ║
║     Date: ${new Date().toISOString()}              ║
╚══════════════════════════════════════════════════════════╝
  `);

  // Test 1: Login
  console.log("\n🚀 Starting tests...\n");

  if (!CONFIG.token && (!CONFIG.username || !CONFIG.password)) {
    console.error(
      "\n❌ Missing credentials. Set VIETTEL_USERNAME + VIETTEL_PASSWORD or VIETTEL_TOKEN in environment variables."
    );
    return;
  }
  
  if (!CONFIG.token) {
    console.log("1️⃣  LOGIN (Get Token)");
    const loginSuccess = await testLogin();
    if (!loginSuccess) {
      console.error(
        "\n❌ Login failed. Check your USERNAME and PASSWORD."
      );
      return;
    }
  } else {
    console.log(`✅ Using existing token: ${CONFIG.token.substring(0, 20)}...`);
  }

  // Test remaining endpoints
  console.log("\n2️⃣  GET BUU CUC");
  await testGetProvinces();

  console.log("\n3️⃣  GET PROVINCE BY ID");
  await testGetProvinceById(-1);

  const provinceIdForAddress = PRICE_SAMPLE.SENDER_PROVINCE;
  console.log("\n3️⃣  GET DISTRICTS");
  const districts = await testGetDistricts(provinceIdForAddress);

  const firstDistrict = districts[0] || {};
  const districtIdForAddress = firstDistrict.DISTRICT_ID || firstDistrict.districtId || PRICE_SAMPLE.SENDER_DISTRICT;

  console.log("\n3️⃣  GET WARDS");
  const wards = await testGetWards(districtIdForAddress);

  const firstWard = wards[0] || {};
  const wardIdForAddress = firstWard.WARDS_ID || firstWard.wardsId || 0;

  const receiverDistrictId = PRICE_SAMPLE.RECEIVER_DISTRICT;
  console.log("\n3️⃣  GET RECEIVER WARDS");
  const receiverWards = await testGetWards(receiverDistrictId);
  const firstReceiverWard = receiverWards[0] || {};
  const receiverWardId = firstReceiverWard.WARDS_ID || firstReceiverWard.wardsId || 0;

  console.log("\n4️⃣  GET SERVICES");
  await testGetServices();

  console.log("\n5️⃣  GET SERVICE EXTRA");
  await testGetServiceExtra("");

  const priceBody = {
    ...PRICE_SAMPLE,
    SENDER_WARD: wardIdForAddress,
    RECEIVER_WARD: receiverWardId,
  };

  console.log("\n5️⃣  GET PRICE");
  await testGetPrice(priceBody);

  console.log("\n5️⃣  GET PRICE ALL");
  const priceAllResult = await testGetPriceAll(priceBody);
  const orderService = extractServiceCodeFromPriceAll(priceAllResult);
  if (orderService) {
    priceBody.ORDER_SERVICE = orderService;
    console.log(`\n✅ Using ORDER_SERVICE from getPriceAll: ${orderService}`);
  } else {
    console.log("\n⚠️  Could not resolve ORDER_SERVICE from getPriceAll");
  }

  console.log("\n5️⃣  GET PRICE NLP");
  await testGetPriceNlp(priceBody);

  console.log("\n5️⃣  GET PRICE ALL NLP");
  await testGetPriceAllNlp(priceBody);

  console.log("\n6️⃣  GET INVENTORY (Locations)");
  const inventoryLocation = await testGetOrderList();

  console.log("\n7️⃣  CREATE TEST ORDER");
  const orderNumber = await testCreateOrder(
    inventoryLocation,
    priceBody.ORDER_SERVICE || "",
    {
      SENDER_PROVINCE: priceBody.SENDER_PROVINCE,
      SENDER_DISTRICT: priceBody.SENDER_DISTRICT,
      SENDER_WARD: priceBody.SENDER_WARD,
      SENDER_ADDRESS: "So 5A ngach 22 ngo 282 Kim Giang, Dai Kim, Hoang Mai, Ha Noi",
      RECEIVER_PROVINCE: priceBody.RECEIVER_PROVINCE,
      RECEIVER_DISTRICT: priceBody.RECEIVER_DISTRICT,
      RECEIVER_WARD: priceBody.RECEIVER_WARD,
      RECEIVER_ADDRESS: "1 NKKN P.Nguyen Thai Binh, Quan 1, TP Ho Chi Minh",
    }
  );

  const currentOrderNumber = orderNumber || extractOrderNumber({ data: { ORDER_NUMBER: process.env.VIETTEL_ORDER_NUMBER || "" } });

  console.log("\n8️⃣  UPDATE ORDER");
  await testUpdateOrder(currentOrderNumber);

  console.log("\n9️⃣  GET PRINT LINK");
  await testEncryptLinkPrint(currentOrderNumber);

  console.log("\n🔟  REGISTER JOURNEY PUSHBACK");
  await testRegisterOrderHook(currentOrderNumber);

  if (CONFIG.enable_legacy_status_test) {
    console.log("\n1️⃣1️⃣  LEGACY CHECK ORDER STATUS");
    await testGetOrderStatus(currentOrderNumber);
  } else {
    console.log("\nℹ️  Skipping legacy getOrderStatus test. Viettel's documented journey flow relies on webhook updates and registerOrderHook for itinerary re-sync.");
  }

  console.log(`
╔══════════════════════════════════════════════════════════╗
║     ✅ ALL TESTS COMPLETED                               ║
╚══════════════════════════════════════════════════════════╝
  `);
}

// ===== RUN TESTS =====
runAllTests().catch(console.error);
