import 'package:flutter/material.dart';
import 'l10n/marathi_strings.dart';

void main() {
  runApp(const SeavaigFarmerApp());
}

class SeavaigFarmerApp extends StatelessWidget {
  const SeavaigFarmerApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: MarathiStrings.appTitle,
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        primarySwatch: Colors.blue,
        scaffoldBackgroundColor: const Color(0xFFF8FAFC),
        useMaterial3: true,
      ),
      home: const FarmerHomeScreen(),
    );
  }
}

class CompanyBrand {
  final String id;
  final String name;
  final String branch;
  final String outstanding;
  final String advanceCredit;
  final Color primaryColor;

  CompanyBrand({
    required this.id,
    required this.name,
    required this.branch,
    required this.outstanding,
    required this.advanceCredit,
    required this.primaryColor,
  });
}

class FarmerHomeScreen extends StatefulWidget {
  const FarmerHomeScreen({super.key});

  @override
  State<FarmerHomeScreen> createState() => _FarmerHomeScreenState();
}

class _FarmerHomeScreenState extends State<FarmerHomeScreen> {
  int _selectedIndex = 0;

  final List<CompanyBrand> _companies = [
    CompanyBrand(
      id: 'c1',
      name: 'महाबळेश्वर स्ट्रॉबेरी अ‍ॅग्रो',
      branch: 'नांदगाव शाखा (FAR-10001)',
      outstanding: '₹२३,६००',
      advanceCredit: '₹१०,००० (कापला)',
      primaryColor: const Color(0xFF1D4ED8),
    ),
    CompanyBrand(
      id: 'c2',
      name: 'नाशिक बेरी प्रोक्युर्मेन्ट',
      branch: 'नाशिक शाखा (FAR-9021)',
      outstanding: '₹५,२००',
      advanceCredit: '₹०',
      primaryColor: const Color(0xFF0D9488),
    ),
  ];

  late CompanyBrand _selectedCompany;

  @override
  void initState() {
    super.initState();
    _selectedCompany = _companies[0];
  }

  void _showReceiptDetailBottomSheet(
    BuildContext context,
    String purNo,
    String crop,
    String weight,
    String rate,
    String total,
    String advanceApplied,
    String remainingDue,
    String status,
    String date,
  ) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (context) {
        return Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(purNo, style: const TextStyle(color: Color(0xFF2563EB), fontWeight: FontWeight.bold, fontSize: 14)),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: status == 'PAID' ? const Color(0xFF10B981) : const Color(0xFFF59E0B),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      status == 'PAID' ? 'पूर्ण पेड (PAID)' : 'हप्ता बाकी (PARTIAL)',
                      style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              Text(_selectedCompany.name, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w900, color: Color(0xFF0F172A))),
              Text(_selectedCompany.branch, style: const TextStyle(fontSize: 11, color: Color(0xFF64748B))),
              const Divider(height: 24),
              _buildDetailRow('शेतकऱ्याचे नाव:', 'रमेश पाटील'),
              _buildDetailRow('पिक / जात:', crop),
              _buildDetailRow('वजन व प्रमाण:', weight),
              _buildDetailRow('प्रति दर:', rate),
              _buildDetailRow('दिनांक व वेळ:', date),
              const Divider(height: 24),
              _buildDetailRow('एकूण बिल रक्कम:', total, isBold: true),
              _buildDetailRow('अ‍ॅडव्हान्स जमा कापला:', '- $advanceApplied', color: const Color(0xFF10B981)),
              const Divider(height: 16),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('शिल्लक देय बाकी (Due):', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                  Text(remainingDue, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w900, color: Color(0xFF1D4ED8))),
                ],
              ),
              const SizedBox(height: 24),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF1D4ED8),
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                  ),
                  onPressed: () => Navigator.pop(context),
                  child: const Text('पावती बंद करा (Close)', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildDetailRow(String label, String val, {bool isBold = false, Color? color}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4.0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(color: Color(0xFF64748B), fontSize: 12)),
          Text(val, style: TextStyle(color: color ?? const Color(0xFF0F172A), fontWeight: isBold ? FontWeight.bold : FontWeight.w600, fontSize: 12)),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0.5,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('कंपनी निवडा (Select Buyer)', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 9, fontWeight: FontWeight.bold)),
            DropdownButtonHideUnderline(
              child: DropdownButton<CompanyBrand>(
                value: _selectedCompany,
                isDense: true,
                icon: const Icon(Icons.keyboard_arrow_down, color: Color(0xFF2563EB)),
                onChanged: (CompanyBrand? newCompany) {
                  if (newCompany != null) {
                    setState(() {
                      _selectedCompany = newCompany;
                    });
                  }
                },
                items: _companies.map<DropdownMenuItem<CompanyBrand>>((CompanyBrand company) {
                  return DropdownMenuItem<CompanyBrand>(
                    value: company,
                    child: Text(
                      company.name,
                      style: const TextStyle(color: Color(0xFF0F172A), fontWeight: FontWeight.bold, fontSize: 13),
                    ),
                  );
                }).toList(),
              ),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.notifications_none, color: Color(0xFF64748B)),
            onPressed: () {},
          ),
        ],
      ),
      body: _buildSelectedTabBody(),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _selectedIndex,
        onTap: (idx) => setState(() => _selectedIndex = idx),
        selectedItemColor: _selectedCompany.primaryColor,
        unselectedItemColor: const Color(0xFF94A3B8),
        items: const [
          BottomNavigationBarItem(icon: Icon(Icons.home_outlined), label: 'मुख्य पृष्ठ'),
          BottomNavigationBarItem(icon: Icon(Icons.receipt_long_outlined), label: 'बिल पारदर्शकता'),
          BottomNavigationBarItem(icon: Icon(Icons.payment_outlined), label: 'पेमेंट व अ‍ॅडव्हान्स'),
          BottomNavigationBarItem(icon: Icon(Icons.person_outline), label: 'प्रोफाईल'),
        ],
      ),
    );
  }

  Widget _buildSelectedTabBody() {
    switch (_selectedIndex) {
      case 0:
        return _buildHomeTab();
      case 1:
        return _buildLedgerTab();
      case 2:
        return _buildPayoutsTab();
      case 3:
        return _buildProfileTab();
      default:
        return _buildHomeTab();
    }
  }

  Widget _buildHomeTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          AnimatedContainer(
            duration: const Duration(milliseconds: 300),
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: _selectedCompany.primaryColor,
              borderRadius: BorderRadius.circular(20),
              boxShadow: [
                BoxShadow(color: _selectedCompany.primaryColor.withAlpha(76), blurRadius: 10, offset: const Offset(0, 4)),
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(MarathiStrings.welcomeFarmer, style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 15)),
                        const SizedBox(height: 4),
                        Text(_selectedCompany.branch, style: const TextStyle(color: Colors.white70, fontSize: 11)),
                      ],
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(color: const Color(0xFF10B981), borderRadius: BorderRadius.circular(12)),
                      child: const Text('सक्रिय (Active)', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 10)),
                    ),
                  ],
                ),
                const SizedBox(height: 20),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(MarathiStrings.currentOutstanding, style: TextStyle(color: Colors.white70, fontSize: 11)),
                        const SizedBox(height: 4),
                        Text(_selectedCompany.outstanding, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 26)),
                      ],
                    ),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        const Text('अ‍ॅडव्हान्स जमा कापला', style: TextStyle(color: Colors.white70, fontSize: 10)),
                        const SizedBox(height: 4),
                        Text(_selectedCompany.advanceCredit, style: const TextStyle(color: Color(0xFF6EE7B7), fontWeight: FontWeight.w900, fontSize: 16)),
                      ],
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('पावतीनुसार बिल पारदर्शकता (${_selectedCompany.name})', style: const TextStyle(color: Color(0xFF0F172A), fontWeight: FontWeight.bold, fontSize: 13)),
              const Text('सर्व पहा', style: TextStyle(color: Color(0xFF2563EB), fontWeight: FontWeight.bold, fontSize: 11)),
            ],
          ),
          const SizedBox(height: 12),

          _buildBillCard('पावती #PUR-2026-1052', 'स्ट्रॉबेरी (अ वर्ग)', '१२० किलो (कॅरेट)', '₹२८० / किलो', '₹३३,६००', '₹१०,०००', '₹२३,६००', 'PARTIAL', '०५ ऑगस्ट २०२६'),
          _buildBillCard('पावती #PUR-2026-1051', 'द्राक्षे (सोनाका)', '१५० किलो (कॅरेट)', '₹१८० / किलो', '₹२७,०००', '₹०', '₹२७,०००', 'UNPAID', '०५ ऑगस्ट २०२६'),
        ],
      ),
    );
  }

  Widget _buildLedgerTab() {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Text('${_selectedCompany.name} - पावतीनुसार पासबुक', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
        const SizedBox(height: 12),
        _buildBillCard('पावती #PUR-2026-1052', 'स्ट्रॉबेरी (अ वर्ग)', '१२० किलो', '₹२८० / किलो', '₹३३,६००', '₹१०,०००', '₹२३,६००', 'PARTIAL', '०५ ऑगस्ट २०२६'),
        _buildBillCard('पावती #PUR-2026-1050', 'स्ट्रॉबेरी (अ वर्ग)', '१८० किलो', '₹२८० / किलो', '₹५०,४००', '₹५०,४००', '₹०', 'PAID', '०४ ऑगस्ट २०२६'),
      ],
    );
  }

  Widget _buildPayoutsTab() {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Text('${_selectedCompany.name} - जमा पेमेंट नोंदी', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
        const SizedBox(height: 12),
        _buildBillCard('पेमेंट जमा #PAY-0852', 'UPI (GPay Transfer)', '—', '—', '₹१५,०००', '₹०', '₹०', 'PAID', '०५ ऑगस्ट २०२६'),
        _buildBillCard('अ‍ॅडव्हान्स जमा #PAY-0820', 'Cash Advance Payout', '—', '—', '₹१०,०००', '₹०', '₹०', 'PAID', '०१ ऑगस्ट २०२६'),
      ],
    );
  }

  Widget _buildProfileTab() {
    return Padding(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        children: [
          const CircleAvatar(radius: 36, backgroundColor: Color(0xFF1D4ED8), child: Icon(Icons.person, size: 40, color: Colors.white)),
          const SizedBox(height: 12),
          const Text('रमेश पाटील (Ramesh Patil)', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
          const Text('नांदगाव, नाशिक (FAR-10001)', style: TextStyle(color: Color(0xFF64748B), fontSize: 12)),
          const SizedBox(height: 24),
          _buildDetailRow('मोबाईल नंबर:', '+९१ ९८२३४ ५६७८९'),
          _buildDetailRow('बँक खाते क्रमांक:', 'XXXX XXXX ३३४४'),
          _buildDetailRow('IFSC कोड:', 'MAHB0001234'),
        ],
      ),
    );
  }

  Widget _buildBillCard(
    String purNo,
    String crop,
    String weight,
    String rate,
    String total,
    String advanceApplied,
    String remainingDue,
    String status,
    String date,
  ) {
    return InkWell(
      onTap: () => _showReceiptDetailBottomSheet(context, purNo, crop, weight, rate, total, advanceApplied, remainingDue, status, date),
      child: Container(
        margin: const EdgeInsets.only(bottom: 10),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: const Color(0xFFE2E8F0)),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Row(
              children: [
                Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(
                    color: Colors.blue.shade50,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Center(child: Text('🌾', style: TextStyle(fontSize: 20))),
                ),
                const SizedBox(width: 12),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(purNo, style: const TextStyle(color: Color(0xFF2563EB), fontWeight: FontWeight.bold, fontSize: 11)),
                    const SizedBox(height: 2),
                    Text(crop, style: const TextStyle(color: Color(0xFF0F172A), fontWeight: FontWeight.bold, fontSize: 12)),
                    const SizedBox(height: 2),
                    Text('$weight ($rate)', style: const TextStyle(color: Color(0xFF64748B), fontSize: 10)),
                  ],
                ),
              ],
            ),
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text(total, style: const TextStyle(color: Color(0xFF0F172A), fontWeight: FontWeight.w900, fontSize: 14)),
                const SizedBox(height: 4),
                Text(date, style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 9)),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
