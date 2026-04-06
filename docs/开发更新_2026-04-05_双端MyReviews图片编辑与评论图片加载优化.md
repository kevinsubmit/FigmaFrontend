# 双端 My Reviews 图片编辑与评论图片加载优化

日期：2026-04-05

## 目标
- 修复 iOS `My Reviews` 页面中已发布图片只能展示、不能编辑的问题。
- 让 Android `My Reviews` 编辑能力与 H5 对齐，支持删除已有图片和新增图片。
- 优化 iOS / Android 店铺详情页 `Reviews` 图片查看前的加载体验，减少点击后慢加载和偶发失败。

## 本次改动

### iOS
- `My Reviews` 列表卡片继续展示已发布图片。
- `Edit Review` 弹窗补齐图片编辑能力：
  - 展示已发布图片。
  - 支持删除已发布图片。
  - 支持从相册继续新增图片。
  - 保存时会先上传新增图片，再与保留的旧图合并提交。
  - 最多 5 张图。
- 店铺详情页 `Reviews` 缩略图和全屏查看器增加图片预热：
  - 图片进入可视区域时开始预取。
  - 点击缩略图进入查看器前，对整组图片做预热。
  - 查看器打开后继续保持整组图片预热。

### Android
- `My Reviews` 列表卡片继续展示已发布图片。
- `Edit Review` 底部弹窗补齐图片编辑能力：
  - 展示已发布图片。
  - 支持删除已发布图片。
  - 支持继续添加新图片。
  - 保存时先上传新图片，再与保留旧图合并更新。
  - 最多 5 张图。
- 店铺详情页 `Reviews` 缩略图和全屏查看器增加图片预热：
  - 评论卡片内的图片列表会预取。
  - 全屏图片查看器打开前后都会对整组图片做预热。

### H5
- 本轮未改代码。
- 原因：H5 的 `ReviewForm` 原本就支持编辑时保留已有图片、删除已有图片和新增图片。

## 涉及文件
- iOS
  - `ios-app/NailsDashIOS/Sources/Features/Profile/MyReviewsView.swift`
  - `ios-app/NailsDashIOS/Sources/Features/Profile/ProfileRewardsViewModels.swift`
  - `ios-app/NailsDashIOS/Sources/Features/Stores/StoreDetailView.swift`
- Android
  - `android-app/app/src/main/java/com/nailsdash/android/ui/screen/ProfileDetailScreens.kt`
  - `android-app/app/src/main/java/com/nailsdash/android/ui/state/ProfileViewModels.kt`
  - `android-app/app/src/main/java/com/nailsdash/android/ui/screen/BookFlowScreens.kt`

## 验证
- iOS：
  - `xcodebuild -project /Users/fengliangli/code/FigmaFrontend/ios-app/NailsDashIOS.xcodeproj -scheme NailsDashIOS -configuration Debug -destination 'generic/platform=iOS Simulator' CODE_SIGNING_ALLOWED=NO build`
- Android：
  - `JAVA_HOME='/Applications/Android Studio.app/Contents/jbr/Contents/Home' ./gradlew :app:assembleDebug -x lint`
- 结果：均通过。

## 结果
- iOS / Android 现在都可以在 `My Reviews -> Edit` 中删除旧图、增加新图。
- 双端店铺详情页评论图片区的首图和整组图片加载更稳定。
