import 'package:flutter_test/flutter_test.dart';
import 'package:farmer_mobile_app/main.dart';

void main() {
  testWidgets('Farmer App Smoke Test', (WidgetTester tester) async {
    await tester.pumpWidget(const SeavaigFarmerApp());
    expect(find.byType(SeavaigFarmerApp), findsOneWidget);
  });
}
