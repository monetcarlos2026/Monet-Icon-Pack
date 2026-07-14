# Monet Icon Pack 修改 Package Name 教程

适用项目：[monetcarlos2026/Monet-Icon-Pack](https://github.com/monetcarlos2026/Monet-Icon-Pack)

## 一、先弄清两个名称

这个项目已经把两个概念分开：

- `MyApp.applicationId`：APK 安装到手机后的真正包名，也是应用商店识别应用的 ID。
- `MyApp.appId`：Android 的 `namespace`，决定 `R`、`BuildConfig` 和现有 Kotlin 源码所在的命名空间。

项目当前配置位于 `buildSrc/src/main/java/MyApp.kt`：

```kotlin
object MyApp {
    const val appId = "dev.jahir.blueprint.app"
    const val applicationId = "com.monetcarlos2026.iconpack"

    const val version = 1
    const val versionName = "1.0.0"
}
```

如果你的目的只是让生成的 APK 使用自己的包名，**只改 `applicationId`，不要改 `appId`**。

## 二、推荐做法：只修改安装包名

### 1. 下载并打开项目

```bash
git clone https://github.com/monetcarlos2026/Monet-Icon-Pack.git
cd Monet-Icon-Pack
```

用 Android Studio 打开项目根目录，等待 Gradle Sync 完成。项目使用 JDK 17；若同步报 Java 版本错误，在 Android Studio 的 Gradle JDK 设置中选择 JDK 17。

### 2. 修改 `applicationId`

打开：

```text
buildSrc/src/main/java/MyApp.kt
```

例如，要把包名改成 `com.example.myicons`：

```kotlin
object MyApp {
    const val appId = "dev.jahir.blueprint.app"
    const val applicationId = "com.example.myicons"

    const val version = 1
    const val versionName = "1.0.0"
}
```

包名建议遵守以下规则：

- 使用小写英文字母、数字和下划线。
- 至少包含两段，例如 `com.example.myicons`。
- 每一段不能以数字开头。
- 不要包含空格、短横线或中文。
- 准备发布到 Google Play 时，一旦使用某个包名发布，就不能再给原应用更换包名。

项目的 `app/build.gradle` 会自动读取这个值：

```gradle
applicationId MyApp.applicationId
```

因此通常不需要修改 `app/build.gradle` 或 `AndroidManifest.xml`。

### 3. 同步并构建

Android Studio 中依次执行：

1. **File > Sync Project with Gradle Files**
2. **Build > Clean Project**
3. **Build > Rebuild Project**

也可以在项目根目录运行：

```bash
./gradlew clean assembleDebug
```

Debug APK 一般生成在：

```text
app/build/outputs/apk/debug/
```

这个项目使用 `applicationId-versionName` 作为 APK 文件名的一部分，所以改完后输出名也会跟着变化。

### 4. 验证最终包名

安装后可用 ADB 检查：

```bash
adb shell pm list packages | grep com.example.myicons
```

如果本机 Android SDK 提供 `aapt`，也可以直接检查 APK：

```bash
aapt dump badging app/build/outputs/apk/debug/*.apk | grep "package: name="
```

或者使用 `apkanalyzer`：

```bash
apkanalyzer manifest application-id app/build/outputs/apk/debug/*.apk
```

预期输出：

```text
com.example.myicons
```

## 三、为什么不用改 AndroidManifest.xml

这个项目的清单没有写死旧包名，并且关键 Provider 使用了 `${applicationId}`：

```xml
android:authorities="${applicationId}.fileProvider"
android:authorities="${applicationId}.muzei"
```

构建时 Gradle 会自动将 `${applicationId}` 替换为你的新包名。因此不要手动把它们改成固定字符串，否则以后再次改包名时更容易遗漏。

`MainActivity`、`MyApplication` 和 `MuzeiService` 则使用相对类名，例如：

```xml
android:name=".MainActivity"
```

保留原来的 `namespace` 后，这些类仍然可以正常定位。

## 四、旧版和新版能否同时安装

可以。Android 使用 `applicationId` 判断是不是同一个应用：

- 新旧包名不同：会被视为两个独立应用，可以同时安装，数据也互不共享。
- 包名相同、签名相同：可以覆盖升级。
- 包名相同、签名不同：会报签名冲突，必须卸载旧版，或者使用原签名重新签名。

修改包名后，原应用的数据、设置和数据库不会自动迁移到新应用。

## 五、构建 Release APK

项目会从仓库根目录的 `keystore.properties` 读取签名配置。可先在 Android Studio 中通过 **Build > Generate Signed App Bundle / APK** 创建自己的 keystore，然后在根目录新建：

```properties
storeFile=/绝对路径/your-release-key.jks
storePassword=你的仓库密码
keyAlias=你的别名
keyPassword=你的密钥密码
```

不要把 `keystore.properties`、`.jks` 文件或密码提交到公开 Git 仓库。

构建命令：

```bash
./gradlew clean assembleRelease
```

Release APK 一般位于：

```text
app/build/outputs/apk/release/
```

如果要持续更新已经发布的应用，必须一直保存并使用同一份签名密钥。

## 六、可选：连源码 namespace 一起彻底改名

普通使用不需要做这一节。只有当你不希望源码中继续出现 `dev.jahir.blueprint.app` 时才进行完整重构。

假设统一改成 `com.example.myicons`：

1. 在 Android Studio 左侧切换到 **Project** 视图。
2. 找到 `app/src/main/kotlin/dev/jahir/blueprint/app`。
3. 取消 Project 面板中的 **Compact Middle Packages**。
4. 依次右键包名各层，选择 **Refactor > Rename > Rename package**，重构为 `com.example.myicons`。
5. 确认所有 Kotlin 文件的 `package` 声明和项目内部 `import` 都已更新。
6. 将 `MyApp.kt` 中两个值都改成新包名：

```kotlin
const val appId = "com.example.myicons"
const val applicationId = "com.example.myicons"
```

7. 全局搜索旧名称，确认业务源码中没有遗漏：

```bash
rg -n "dev\.jahir\.blueprint\.app|com\.monetcarlos2026\.iconpack" \
  app buildSrc
```

8. 执行：

```bash
./gradlew clean assembleDebug
```

不要直接只改 `appId` 而不重构源码。当前 Kotlin 文件使用 `dev.jahir.blueprint.app` 包声明，并直接引用同一 namespace 下生成的 `R` 和 `BuildConfig`；只改单侧通常会产生 `Unresolved reference: R` 或 `Unresolved reference: BuildConfig`。

## 七、OneSignal 的特殊注意点

当前 `AndroidManifest.xml` 中 OneSignal 服务配置是注释状态。若你以后启用它，同时采用“只改 `applicationId`、保留旧 namespace”的推荐方案，不要使用：

```xml
android:value="${applicationId}.NotificationServiceExtension"
```

因为这个 Kotlin 类仍位于 `dev.jahir.blueprint.app`。应改为：

```xml
android:value="dev.jahir.blueprint.app.NotificationServiceExtension"
```

如果你已经完成第六节的完整源码包重构，并且 namespace 与 applicationId 相同，则可以继续使用 `${applicationId}`。

此外，OneSignal、Firebase、Google Play Billing、授权服务器或其他第三方平台如果按包名注册应用，都需要在对应后台重新登记新包名并下载新的配置文件或密钥。

## 八、常见报错

### `INSTALL_FAILED_UPDATE_INCOMPATIBLE`

同一个包名已经安装，但 APK 签名不同。卸载旧应用，或者使用旧应用相同的签名密钥。

```bash
adb uninstall com.example.myicons
```

### `Unresolved reference: R` / `BuildConfig`

通常是修改了 `MyApp.appId`，但没有同步重构 Kotlin 包。恢复 `appId = "dev.jahir.blueprint.app"`，或者完成第六节的完整重构。

### `Manifest merger failed ... authorities`

检查 Provider 的 `android:authorities` 是否仍使用 `${applicationId}`，以及是否存在其他清单文件写死了旧包名。

### Gradle 同步后仍使用旧值

先执行：

```bash
./gradlew --stop
./gradlew clean assembleDebug
```

仍不正常时，在 Android Studio 中执行 **File > Invalidate Caches**，重启后重新同步。

## 九、最简操作总结

只想把 APK 包名从：

```text
com.monetcarlos2026.iconpack
```

改成自己的包名，只需编辑 `buildSrc/src/main/java/MyApp.kt`：

```kotlin
const val applicationId = "com.example.myicons"
```

保持下面这行不变：

```kotlin
const val appId = "dev.jahir.blueprint.app"
```

然后运行：

```bash
./gradlew clean assembleDebug
```

这就是该项目风险最低、改动最少的包名修改方式。
