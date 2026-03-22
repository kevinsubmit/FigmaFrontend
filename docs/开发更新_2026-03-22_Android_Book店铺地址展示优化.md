# Android Book 店铺地址展示优化

## 本次调整
- `Book` 页面店铺列表卡片中的店铺地址字体缩小。
- 去掉地址单行省略号，改为完整展示。

## 影响文件
- `android-app/app/src/main/java/com/nailsdash/android/ui/screen/StoresScreen.kt`

## 具体修改
- 地址字号从 `18.sp` 调整为 `14.sp`
- 去掉 `maxLines = 1`
- 去掉 `overflow = TextOverflow.Ellipsis`
- 增加 `lineHeight = 18.sp`

## 验证
- 执行：`JAVA_HOME='/Applications/Android Studio.app/Contents/jbr/Contents/Home' ./gradlew :app:assembleDebug -x lint`
- 结果：`BUILD SUCCESSFUL`
