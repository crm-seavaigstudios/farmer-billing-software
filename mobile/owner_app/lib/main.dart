import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'screens/login_screen.dart';
import 'updater.dart';

void main() {
  runApp(const SeavaigOwnerApp());
}

class SeavaigOwnerApp extends StatefulWidget {
  final String? initialTenantId;
  const SeavaigOwnerApp({super.key, this.initialTenantId});

  @override
  State<SeavaigOwnerApp> createState() => _SeavaigOwnerAppState();
}

class _SeavaigOwnerAppState extends State<SeavaigOwnerApp> {
  String _currentLanguage = 'mr';

  void _cycleLanguage() {
    setState(() {
      if (_currentLanguage == 'mr') {
        _currentLanguage = 'hi';
      } else if (_currentLanguage == 'hi') {
        _currentLanguage = 'en';
      } else {
        _currentLanguage = 'mr';
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      checkForUpdates(context);
    });

    Color primaryColor = const Color(0xFF2563EB); // Default blue

    return FutureBuilder<SharedPreferences>(
      future: SharedPreferences.getInstance(),
      builder: (context, snapshot) {
        if (snapshot.hasData) {
          final colorString = snapshot.data!.getString('tenantPrimaryColor');
          if (colorString != null && colorString.startsWith('#')) {
            try {
              primaryColor = Color(int.parse(colorString.substring(1, 7), radix: 16) + 0xFF000000);
            } catch (e) {}
          }
        }

        return MaterialApp(
      title: 'SEAVAIG Owner Enterprise Mobile CRM',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: primaryColor),
        fontFamily: 'Roboto',
        useMaterial3: true,
      ),
      home: widget.initialTenantId == null 
        ? const LoginScreen() 
        : OwnerMainScreen(
            currentLanguage: _currentLanguage,
            onCycleLanguage: _cycleLanguage,
            tenantId: widget.initialTenantId!,
          ),
      );
    });
    );
  }
}

class OwnerMainScreen extends StatefulWidget {
  final String currentLanguage;
  final VoidCallback onCycleLanguage;
  final String tenantId;

  const OwnerMainScreen({
    super.key,
    required this.currentLanguage,
    required this.onCycleLanguage,
    required this.tenantId,
  });

  @override
  State<OwnerMainScreen> createState() => _OwnerMainScreenState();
}

class _OwnerMainScreenState extends State<OwnerMainScreen> {
  int _currentNavIndex = 0;
  final String _businessName = 'Seavaig Farmers Agro Agency';

  // Dynamic CRUD Data State Arrays
  final List<Map<String, dynamic>> _farmers = [
    {'id': 'far-101', 'name': 'Ramesh Patil', 'code': 'FAR-10001', 'village': 'Nandgaon', 'due': '₹23,600', 'phone': '9823456789', 'grade': 'A Grade'},
    {'id': 'far-102', 'name': 'Suresh Jadhav', 'code': 'FAR-10002', 'village': 'Yeola', 'due': '₹0 (Clear)', 'phone': '9765432100', 'grade': 'B Grade'},
    {'id': 'far-103', 'name': 'Vijay Shinde', 'code': 'FAR-10003', 'village': 'Pimpalgaon', 'due': '₹15,400', 'phone': '8856789123', 'grade': 'A Grade'},
  ];

  final List<Map<String, dynamic>> _purchases = [
    {'id': 'pur-101', 'billNo': 'PUR-2026-1052', 'farmer': 'Ramesh Patil', 'crop': 'Strawberry A (120 KG)', 'advanceApplied': '₹10,000', 'due': '₹23,600', 'status': 'PARTIAL'},
  ];

  final List<Map<String, dynamic>> _inventory = [
    {'id': 'inv-101', 'item': 'Strawberry Crop Stock', 'qty': '450 KG', 'valuation': '₹1,26,000', 'category': 'Crops', 'color': Colors.green},
    {'id': 'inv-102', 'item': 'Plastic Crates (Packaging)', 'qty': '1,200 Qty', 'valuation': '₹1,08,000', 'category': 'Crates', 'color': Colors.amber},
  ];

  final List<Map<String, dynamic>> _workers = [
    {'id': 'wrk-101', 'name': 'Ganesh More', 'hours': '9.0 hrs (8am-5pm)', 'rate': '₹80/hr', 'payout': '₹720'},
  ];

  final List<Map<String, dynamic>> _traders = [
    {'id': 'trd-101', 'billNo': 'TBILL-2026-1001', 'trader': 'Ambika Crates & Packaging', 'item': '500 Crates', 'paid': '₹20,000', 'due': '₹25,000'},
  ];

  @override
  Widget build(BuildContext context) {
    final lang = widget.currentLanguage;

    final titles = {
      0: lang == 'mr' ? 'डॅशबोर्ड' : lang == 'hi' ? 'डैशबोर्ड' : 'Executive Dashboard',
      1: lang == 'mr' ? 'शेतकरी पासबुक' : lang == 'hi' ? 'किसान पासबुक' : 'Farmers Management',
      2: lang == 'mr' ? 'खरेदी व विक्री' : lang == 'hi' ? 'खरीद एवं बिक्री' : 'Purchases & Sales',
      3: lang == 'mr' ? 'स्मार्ट इन्व्हेंटरी' : lang == 'hi' ? 'स्मार्ट स्टॉक' : 'Smart Inventory',
      4: lang == 'mr' ? 'कामगार हजेरी' : lang == 'hi' ? 'श्रमिक हाजिरी' : 'Daily Workers & Wages',
      5: lang == 'mr' ? 'व्यापारी व पुरवठा' : lang == 'hi' ? 'व्यापारी आपूर्ति' : 'Traders & Supplies',
      6: lang == 'mr' ? 'कस्टम अहवाल' : lang == 'hi' ? 'कस्टम रिपोर्ट' : 'Custom Reports',
    };

    return Scaffold(
      appBar: AppBar(
        title: Text(
          titles[_currentNavIndex] ?? 'SEAVAIG CRM',
          style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 18),
        ),
        backgroundColor: const Color(0xFF0F172A),
        foregroundColor: Colors.white,
        actions: [
          IconButton(
            icon: const Icon(Icons.language, color: Colors.blueAccent),
            tooltip: 'Switch Language / भाषा बदलें',
            onPressed: widget.onCycleLanguage,
          ),
          Center(
            child: Padding(
              padding: const EdgeInsets.only(right: 12.0),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: Colors.blue.withOpacity(0.2),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: Colors.blue.withOpacity(0.4)),
                ),
                child: Text(
                  widget.currentLanguage.toUpperCase(),
                  style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w900, color: Colors.blue),
                ),
              ),
            ),
          ),
        ],
      ),
      drawer: _buildAppDrawer(),
      body: _buildSelectedTabBody(),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _currentNavIndex > 4 ? 0 : _currentNavIndex,
        onTap: (idx) => setState(() => _currentNavIndex = idx),
        type: BottomNavigationBarType.fixed,
        selectedItemColor: const Color(0xFF2563EB),
        unselectedItemColor: Colors.blueGrey,
        items: const [
          BottomNavigationBarItem(icon: Icon(Icons.dashboard), label: 'Dashboard'),
          BottomNavigationBarItem(icon: Icon(Icons.people), label: 'Farmers'),
          BottomNavigationBarItem(icon: Icon(Icons.shopping_bag), label: 'Purchases'),
          BottomNavigationBarItem(icon: Icon(Icons.inventory_2), label: 'Inventory'),
          BottomNavigationBarItem(icon: Icon(Icons.badge), label: 'Workers'),
        ],
      ),
    );
  }

  Widget _buildAppDrawer() {
    return Drawer(
      child: ListView(
        padding: EdgeInsets.zero,
        children: [
          UserAccountsDrawerHeader(
            accountName: Text(_businessName, style: const TextStyle(fontWeight: FontWeight.w900)),
            accountEmail: const Text('admin@seavaig.com (Owner Account)'),
            currentAccountPicture: CircleAvatar(
              backgroundColor: Colors.blue.shade700,
              child: const Text('S', style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: Colors.white)),
            ),
            decoration: const BoxDecoration(color: Color(0xFF0F172A)),
          ),
          ListTile(
            leading: const Icon(Icons.dashboard, color: Colors.blue),
            title: const Text('Executive Dashboard'),
            onTap: () {
              setState(() => _currentNavIndex = 0);
              Navigator.pop(context);
            },
          ),
          ListTile(
            leading: const Icon(Icons.people, color: Colors.teal),
            title: const Text('Farmers Directory & Passbooks'),
            onTap: () {
              setState(() => _currentNavIndex = 1);
              Navigator.pop(context);
            },
          ),
          ListTile(
            leading: const Icon(Icons.shopping_cart, color: Colors.purple),
            title: const Text('Harvest Purchases & Crop Advances'),
            onTap: () {
              setState(() => _currentNavIndex = 2);
              Navigator.pop(context);
            },
          ),
          ListTile(
            leading: const Icon(Icons.inventory_2, color: Colors.indigo),
            title: const Text('Smart Factory Inventory'),
            onTap: () {
              setState(() => _currentNavIndex = 3);
              Navigator.pop(context);
            },
          ),
          ListTile(
            leading: const Icon(Icons.badge, color: Colors.teal),
            title: const Text('Daily Workers & Wages'),
            onTap: () {
              setState(() => _currentNavIndex = 4);
              Navigator.pop(context);
            },
          ),
          ListTile(
            leading: const Icon(Icons.local_shipping, color: Colors.amber),
            title: const Text('Traders & Material Supplies'),
            onTap: () {
              setState(() => _currentNavIndex = 5);
              Navigator.pop(context);
            },
          ),
          ListTile(
            leading: const Icon(Icons.analytics, color: Colors.pink),
            title: const Text('Excel-Style Custom Reports'),
            onTap: () {
              setState(() => _currentNavIndex = 6);
              Navigator.pop(context);
            },
          ),
        ],
      ),
    );
  }

  Widget _buildSelectedTabBody() {
    switch (_currentNavIndex) {
      case 0:
        return _buildDashboardTab();
      case 1:
        return _buildFarmersTab();
      case 2:
        return _buildPurchasesSalesTab();
      case 3:
        return _buildSmartInventoryTab();
      case 4:
        return _buildWorkersTab();
      case 5:
        return _buildTradersTab();
      case 6:
        return _buildReportsTab();
      default:
        return _buildDashboardTab();
    }
  }

  // 1. Executive Realtime Dashboard Tab
  Widget _buildDashboardTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Realtime Business Overview', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w900)),
          const SizedBox(height: 12),
          GridView.count(
            crossAxisCount: 2,
            crossAxisSpacing: 12,
            mainAxisSpacing: 12,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            children: const [
              _MobileStatCard(title: "Today's Purchase", value: '₹1,24,500', color: Colors.blue, subtitle: 'Harvest Crop'),
              _MobileStatCard(title: "Today's Sales", value: '₹1,85,000', color: Colors.teal, subtitle: 'B2B Corporate'),
              _MobileStatCard(title: "Today's Payment", value: '₹95,000', color: Colors.purple, subtitle: 'Disbursed'),
              _MobileStatCard(title: "Pending Dues", value: '₹4,32,000', color: Colors.amber, subtitle: 'Farmer Balance'),
              _MobileStatCard(title: "Total Farmers", value: '148 Active', color: Colors.teal, subtitle: 'Registered'),
              _MobileStatCard(title: "Stock Valuation", value: '₹3,45,000', color: Colors.indigo, subtitle: 'Smart Inventory'),
            ],
          ),
        ],
      ),
    );
  }

  // 2. Farmers Directory with Full CRUD
  Widget _buildFarmersTab() {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text('Farmers Directory (${_farmers.length})', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            ElevatedButton.icon(
              onPressed: _showAddFarmerDialog,
              icon: const Icon(Icons.add, size: 16),
              label: const Text('Add Farmer'),
            ),
          ],
        ),
        const SizedBox(height: 12),
        ..._farmers.map((f) => Card(
          margin: const EdgeInsets.only(bottom: 10),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          child: ListTile(
            leading: CircleAvatar(
              backgroundColor: Colors.blue.shade100,
              child: Text(f['name'][0], style: TextStyle(fontWeight: FontWeight.bold, color: Colors.blue.shade900)),
            ),
            title: Text(f['name'], style: const TextStyle(fontWeight: FontWeight.bold)),
            subtitle: Text('${f['code']} • ${f['village']} • Ph: ${f['phone']}'),
            trailing: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text(f['due'], style: const TextStyle(fontWeight: FontWeight.w900, color: Colors.amber, fontSize: 12)),
                    Text(f['grade'], style: const TextStyle(fontSize: 10, color: Colors.blue, fontWeight: FontWeight.bold)),
                  ],
                ),
                PopupMenuButton<String>(
                  onSelected: (val) {
                    if (val == 'edit') _showEditFarmerDialog(f);
                    if (val == 'delete') setState(() => _farmers.removeWhere((x) => x['id'] == f['id']));
                  },
                  itemBuilder: (ctx) => const [
                    PopupMenuItem(value: 'edit', child: Text('Edit Farmer')),
                    PopupMenuItem(value: 'delete', child: Text('Delete Record', style: TextStyle(color: Colors.red))),
                  ],
                ),
              ],
            ),
          ),
        )),
      ],
    );
  }

  // 3. Purchases & Crop Advances with CRUD
  Widget _buildPurchasesSalesTab() {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text('Harvest Crop Purchases', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            ElevatedButton.icon(
              onPressed: _showAddPurchaseDialog,
              icon: const Icon(Icons.add, size: 16),
              label: const Text('Add Purchase'),
            ),
          ],
        ),
        const SizedBox(height: 12),
        ..._purchases.map((p) => Card(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          child: ListTile(
            title: Text('${p['billNo']} • ${p['farmer']}', style: const TextStyle(fontWeight: FontWeight.bold)),
            subtitle: Text('${p['crop']} • Advance Offset: ${p['advanceApplied']}'),
            trailing: Text(p['due'], style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.orange)),
          ),
        )),
      ],
    );
  }

  // 4. Smart Inventory with Inflow/Outflow CRUD
  Widget _buildSmartInventoryTab() {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text('Smart Factory Inventory', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            ElevatedButton.icon(
              onPressed: _showAddStockDialog,
              icon: const Icon(Icons.add, size: 16),
              label: const Text('Add Stock'),
            ),
          ],
        ),
        const SizedBox(height: 12),
        ..._inventory.map((item) => Card(
          child: ListTile(
            leading: Icon(Icons.inventory_2, color: item['color'] as Color),
            title: Text(item['item'], style: const TextStyle(fontWeight: FontWeight.bold)),
            subtitle: Text('Qty: ${item['qty']} • Category: ${item['category']}'),
            trailing: Text(item['valuation'], style: const TextStyle(fontWeight: FontWeight.bold)),
          ),
        )),
      ],
    );
  }

  // 5. Daily Workers with Hours Log & Wage CRUD
  Widget _buildWorkersTab() {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text('Daily Workers & Wages', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            ElevatedButton.icon(
              onPressed: _showAddWorkerDialog,
              icon: const Icon(Icons.add, size: 16),
              label: const Text('Add Worker'),
            ),
          ],
        ),
        const SizedBox(height: 12),
        ..._workers.map((w) => Card(
          child: ListTile(
            leading: const Icon(Icons.badge, color: Colors.teal),
            title: Text(w['name'], style: const TextStyle(fontWeight: FontWeight.bold)),
            subtitle: Text('Logged: ${w['hours']} • Rate: ${w['rate']}'),
            trailing: Text(w['payout'], style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.green)),
          ),
        )),
      ],
    );
  }

  // 6. Traders Tab
  Widget _buildTradersTab() {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text('Traders Directory & Supplies', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            ElevatedButton.icon(
              onPressed: _showAddTraderBillDialog,
              icon: const Icon(Icons.add, size: 16),
              label: const Text('Add Supply Bill'),
            ),
          ],
        ),
        const SizedBox(height: 12),
        ..._traders.map((t) => Card(
          child: ListTile(
            title: Text('${t['billNo']} • ${t['trader']}', style: const TextStyle(fontWeight: FontWeight.bold)),
            subtitle: Text('${t['item']} • Paid: ${t['paid']}'),
            trailing: Text(t['due'], style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.red)),
          ),
        )),
      ],
    );
  }

  // 7. Custom Reports Tab
  Widget _buildReportsTab() {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: const [
        Text('Excel-Style Custom Matrix Reports', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
        SizedBox(height: 12),
        Card(
          child: ListTile(
            leading: Icon(Icons.description, color: Colors.blue),
            title: Text('Export Custom PDF & CSV Matrix'),
            subtitle: Text('Filter across Farmers, Purchases, Sales, Wages, Traders, and Expenses'),
          ),
        ),
      ],
    );
  }

  // CRUD Dialog Modals
  void _showAddFarmerDialog() {
    final nameCtrl = TextEditingController();
    final villageCtrl = TextEditingController();
    final phoneCtrl = TextEditingController();
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Add New Farmer Record'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(controller: nameCtrl, decoration: const InputDecoration(labelText: 'Farmer Name')),
            TextField(controller: villageCtrl, decoration: const InputDecoration(labelText: 'Village')),
            TextField(controller: phoneCtrl, keyboardType: TextInputType.phone, decoration: const InputDecoration(labelText: 'Phone Number')),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () {
              if (nameCtrl.text.isNotEmpty) {
                setState(() {
                  _farmers.add({
                    'id': 'far-${DateTime.now().millisecondsSinceEpoch}',
                    'name': nameCtrl.text,
                    'code': 'FAR-${10000 + _farmers.length + 1}',
                    'village': villageCtrl.text.isEmpty ? 'Nashik' : villageCtrl.text,
                    'due': '₹0 (Clear)',
                    'phone': phoneCtrl.text.isEmpty ? '9823456789' : phoneCtrl.text,
                    'grade': 'A Grade',
                  });
                });
              }
              Navigator.pop(ctx);
            },
            child: const Text('Save Farmer'),
          ),
        ],
      ),
    );
  }

  void _showEditFarmerDialog(Map<String, dynamic> farmer) {
    final nameCtrl = TextEditingController(text: farmer['name']);
    final villageCtrl = TextEditingController(text: farmer['village']);
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text('Edit ${farmer['name']} Record'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(controller: nameCtrl, decoration: const InputDecoration(labelText: 'Farmer Name')),
            TextField(controller: villageCtrl, decoration: const InputDecoration(labelText: 'Village')),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () {
              setState(() {
                farmer['name'] = nameCtrl.text;
                farmer['village'] = villageCtrl.text;
              });
              Navigator.pop(ctx);
            },
            child: const Text('Save Changes'),
          ),
        ],
      ),
    );
  }

  void _showAddPurchaseDialog() {
    final farmerCtrl = TextEditingController(text: 'Ramesh Patil');
    final cropCtrl = TextEditingController(text: 'Strawberry Export (150 KG)');
    final dueCtrl = TextEditingController(text: '₹35,000');
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Add Crop Purchase Bill'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(controller: farmerCtrl, decoration: const InputDecoration(labelText: 'Farmer Name')),
            TextField(controller: cropCtrl, decoration: const InputDecoration(labelText: 'Crop Lot & Quantity')),
            TextField(controller: dueCtrl, decoration: const InputDecoration(labelText: 'Bill Due Amount')),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () {
              setState(() {
                _purchases.add({
                  'id': 'pur-${DateTime.now().millisecondsSinceEpoch}',
                  'billNo': 'PUR-2026-${1050 + _purchases.length}',
                  'farmer': farmerCtrl.text,
                  'crop': cropCtrl.text,
                  'advanceApplied': '₹5,000',
                  'due': dueCtrl.text,
                  'status': 'PARTIAL',
                });
              });
              Navigator.pop(ctx);
            },
            child: const Text('Create Bill'),
          ),
        ],
      ),
    );
  }

  void _showAddStockDialog() {
    final itemCtrl = TextEditingController(text: 'Fertilizer NPK Stock');
    final qtyCtrl = TextEditingController(text: '50 Bags');
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Add Stock Inflow (+)'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(controller: itemCtrl, decoration: const InputDecoration(labelText: 'Stock Item Name')),
            TextField(controller: qtyCtrl, decoration: const InputDecoration(labelText: 'Quantity')),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () {
              setState(() {
                _inventory.add({
                  'id': 'inv-${DateTime.now().millisecondsSinceEpoch}',
                  'item': itemCtrl.text,
                  'qty': qtyCtrl.text,
                  'valuation': '₹45,000',
                  'category': 'Supplies',
                  'color': Colors.blue,
                });
              });
              Navigator.pop(ctx);
            },
            child: const Text('Add Stock'),
          ),
        ],
      ),
    );
  }

  void _showAddWorkerDialog() {
    final nameCtrl = TextEditingController();
    final rateCtrl = TextEditingController(text: '₹80/hr');
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Add Daily Worker Record'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(controller: nameCtrl, decoration: const InputDecoration(labelText: 'Worker Full Name')),
            TextField(controller: rateCtrl, decoration: const InputDecoration(labelText: 'Custom Hourly/Daily Wage Rate')),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () {
              if (nameCtrl.text.isNotEmpty) {
                setState(() {
                  _workers.add({
                    'id': 'wrk-${DateTime.now().millisecondsSinceEpoch}',
                    'name': nameCtrl.text,
                    'hours': '8.0 hrs (8am-4pm)',
                    'rate': rateCtrl.text,
                    'payout': '₹640',
                  });
                });
              }
              Navigator.pop(ctx);
            },
            child: const Text('Save Worker'),
          ),
        ],
      ),
    );
  }

  void _showAddTraderBillDialog() {
    final traderCtrl = TextEditingController(text: 'Ambika Crates');
    final dueCtrl = TextEditingController(text: '₹15,000');
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Add Trader Material Supply Bill'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(controller: traderCtrl, decoration: const InputDecoration(labelText: 'Trader Company Name')),
            TextField(controller: dueCtrl, decoration: const InputDecoration(labelText: 'Bill Due Amount')),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () {
              setState(() {
                _traders.add({
                  'id': 'trd-${DateTime.now().millisecondsSinceEpoch}',
                  'billNo': 'TBILL-2026-${1000 + _traders.length}',
                  'trader': traderCtrl.text,
                  'item': 'Packaging Supplies',
                  'paid': '₹5,000',
                  'due': dueCtrl.text,
                });
              });
              Navigator.pop(ctx);
            },
            child: const Text('Save Supply Bill'),
          ),
        ],
      ),
    );
  }
}

class _MobileStatCard extends StatelessWidget {
  final String title;
  final String value;
  final Color color;
  final String subtitle;

  const _MobileStatCard({
    required this.title,
    required this.value,
    required this.color,
    required this.subtitle,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: color.withOpacity(0.08),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: color.withOpacity(0.3)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text(title, style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: color)),
          const SizedBox(height: 4),
          Text(value, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w900)),
          const SizedBox(height: 2),
          Text(subtitle, style: const TextStyle(fontSize: 9, color: Colors.grey)),
        ],
      ),
    );
  }
}
