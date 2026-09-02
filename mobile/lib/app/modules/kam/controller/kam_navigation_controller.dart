import 'package:get/get.dart';

class KamNavigationController extends GetxController {
  final RxInt currentIndex = 0.obs;
  final RxInt previousIndex = 0.obs;
  final RxBool isTabBarVisible = true.obs;

  void changePage(int index) {
    previousIndex.value = currentIndex.value;
    currentIndex.value = index;
  }

  void setTabBarVisible(bool visible) {
    isTabBarVisible.value = visible;
  }

  void hideTabBar() => isTabBarVisible.value = false;
  void showTabBar() => isTabBarVisible.value = true;
}
