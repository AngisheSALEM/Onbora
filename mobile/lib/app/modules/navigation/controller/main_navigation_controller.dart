import 'package:get/get.dart';

class MainNavigationController extends GetxController {
  final RxInt currentIndex = 0.obs;
  final RxInt previousIndex = 0.obs;
  final RxBool isSearchExpanded = false.obs;
  final RxBool isTabBarVisible = true.obs;

  void changePage(int index) {
    previousIndex.value = currentIndex.value;
    currentIndex.value = index;
    if (isSearchExpanded.value) {
      isSearchExpanded.value = false;
    }
  }

  void toggleSearch(bool expanded) {
    isSearchExpanded.value = expanded;
  }

  void closeSearch() {
    isSearchExpanded.value = false;
  }

  void setTabBarVisible(bool visible) {
    isTabBarVisible.value = visible;
  }

  void hideTabBar() => isTabBarVisible.value = false;
  void showTabBar() => isTabBarVisible.value = true;
}
