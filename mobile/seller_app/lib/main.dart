import 'package:flutter/material.dart';

void main() {
  runApp(const SeavaigSellerApp());
}

class SeavaigSellerApp extends StatelessWidget {
  const SeavaigSellerApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'SEAVAIG Seller App',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFF2563EB)),
        useMaterial3: true,
      ),
      home: const SellerHomeScreen(),
    );
  }
}

class SellerHomeScreen extends StatefulWidget {
  const SellerHomeScreen({super.key});

  @override
  State<SellerHomeScreen> createState() => _SellerHomeScreenState();
}

class _SellerHomeScreenState extends State<SellerHomeScreen> {
  int _selectedIndex = 0;

  final List<Map<String, dynamic>> _cropRates = [
    {'name': 'Strawberry (A Grade Export)', 'unit': 'KG', 'rate': 280.0},
    {'name': 'Grapes (Sonaka)', 'unit': 'KG', 'rate': 110.0},
    {'name': 'Tomato (Hybrid)', 'unit': 'KG', 'rate': 40.0},
    {'name': 'Pomegranate (Bhagwa)', 'unit': 'KG', 'rate': 140.0},
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text(
          'SEAVAIG Seller Portal',
          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18),
        ),
        backgroundColor: const Color(0xFF1E293B),
        foregroundColor: Colors.white,
      ),
      body: _selectedIndex == 0 ? _buildMarketRatesView() : _buildLogisticsView(),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _selectedIndex,
        onTap: (index) => setState(() => _selectedIndex = index),
        items: const [
          BottomNavigationBarItem(
            icon: Icon(Icons.currency_rupee),
            label: 'Daily Crop Rates',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.local_shipping),
            label: 'Logistics Manifest',
          ),
        ],
      ),
    );
  }

  Widget _buildMarketRatesView() {
    return Padding(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Daily Market Rate Sheet (Seller Managed)',
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 4),
          const Text(
            'Rates updated here will reflect on the Owner Dashboard in Read-Only mode.',
            style: TextStyle(fontSize: 12, color: Colors.grey),
          ),
          const SizedBox(height: 16),
          Expanded(
            child: ListView.builder(
              itemCount: _cropRates.length,
              itemBuilder: (context, index) {
                final item = _cropRates[index];
                return Card(
                  elevation: 1,
                  margin: const EdgeInsets.only(bottom: 12),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  child: ListTile(
                    title: Text(item['name'], style: const TextStyle(fontWeight: FontWeight.bold)),
                    subtitle: Text('Unit: ${item['unit']}'),
                    trailing: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          '₹${item['rate']}',
                          style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w900, color: Colors.blue),
                        ),
                        IconButton(
                          icon: const Icon(Icons.edit, size: 20, color: Colors.grey),
                          onPressed: () => _showEditRateDialog(index),
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildLogisticsView() {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        const Text(
          'Active Logistics Manifests & Loading Photos',
          style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 12),
        Card(
          elevation: 2,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: const [
                    Text('INV-2026-9042 • Reliance Fresh Ltd', style: TextStyle(fontWeight: FontWeight.w900, color: Colors.blue)),
                    Chip(
                      label: Text('DISPATCHED', style: TextStyle(fontSize: 10, color: Colors.white, fontWeight: FontWeight.bold)),
                      backgroundColor: Colors.green,
                      padding: EdgeInsets.zero,
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                const Text('Vehicle: MH-15-EG-4052 (Eicher 14ft Container)'),
                const Text('Driver: Prakash Pawar (Ph: 9876543210)'),
                const SizedBox(height: 12),
                const Text('Owner/Driver Uploaded Loading Photo:', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.grey)),
                const SizedBox(height: 8),
                ClipRRect(
                  borderRadius: BorderRadius.circular(12),
                  child: Container(
                    height: 160,
                    width: double.infinity,
                    color: Colors.blueGrey.withOpacity(0.1),
                    child: Stack(
                      alignment: Alignment.center,
                      children: [
                        Image.network(
                          'https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?auto=format&fit=crop&q=80&w=600',
                          fit: BoxFit.cover,
                          width: double.infinity,
                          errorBuilder: (ctx, err, stack) => const Icon(Icons.local_shipping, size: 50, color: Colors.blue),
                        ),
                        Positioned(
                          bottom: 8,
                          right: 8,
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                            decoration: BoxDecoration(
                              color: Colors.black.withOpacity(0.7),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: const Text('Captured via Owner Camera', style: TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold)),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  void _showEditRateDialog(int index) {
    final controller = TextEditingController(text: _cropRates[index]['rate'].toString());
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text('Update ${_cropRates[index]['name']} Rate'),
        content: TextField(
          controller: controller,
          keyboardType: TextInputType.number,
          decoration: const InputDecoration(labelText: 'New Rate (₹ per unit)'),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () {
              setState(() {
                _cropRates[index]['rate'] = double.tryParse(controller.text) ?? _cropRates[index]['rate'];
              });
              Navigator.pop(ctx);
            },
            child: const Text('Save Rate'),
          ),
        ],
      ),
    );
  }
}
