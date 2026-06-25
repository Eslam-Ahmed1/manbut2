# 🛡️ Image Validation — دليل التكامل للفرونت إند

هذا الملف يشرح كل التغييرات المطلوبة في **تطبيق المستخدم (Mobile/Web)** و **لوحة الأدمن (Admin Dashboard)** بسبب إضافة نظام حماية من الصور غير النباتية.

---

## الملخص السريع

| الجهة | هل يوجد تغييرات؟ | مستوى الأهمية |
|-------|-----------------|--------------|
| **تطبيق المستخدم** | ✅ نعم — التعامل مع error codes جديدة | 🔴 مطلوب |
| **لوحة الأدمن** | ✅ نعم — إعدادات جديدة في صفحة Scan Detection | 🟡 مستحسن |

---

# 📱 القسم الأول: تطبيق المستخدم (User App)

## ما الذي تغير؟

الـ API endpoint `POST /api/scans` لم يتغير في الشكل، لكن الآن يمكن أن يرجع **أخطاء جديدة** إذا كانت الصورة:
- ليست بصيغة مدعومة (ليست JPEG/PNG/WebP)
- حجمها أكبر من 10 ميجا
- ملف مُعاد تسميته (مش صورة حقيقية)
- **ليست صورة نبات** (صورة حيوان، شخص، سيارة، إلخ)

## الأخطاء الجديدة التي يجب التعامل معها

### 1. خطأ نوع الملف (`400`)

```json
{
  "message": "Unsupported file type \"application/pdf\". Only JPEG, PNG, and WebP images are allowed."
}
```

**متى يحدث:** المستخدم يرفع ملف ليس صورة (PDF, GIF, SVG, إلخ)

**الإجراء في الـ UI:**
- اعرض رسالة: "الرجاء رفع صورة بصيغة JPEG أو PNG أو WebP فقط"
- يفضل منع الاختيار من الأساس باستخدام file picker filter

### 2. خطأ حجم الملف (`400`)

```json
{
  "message": "File too large (15.2 MB). Maximum allowed size is 10 MB."
}
```

**متى يحدث:** حجم الصورة أكبر من 10 ميجابايت

**الإجراء في الـ UI:**
- اعرض رسالة: "حجم الصورة كبير جداً. الحد الأقصى 10 ميجابايت"
- يفضل ضغط الصورة قبل الإرسال أو تنبيه المستخدم

### 3. خطأ ملف فاسد (`400`)

```json
{
  "message": "File content does not match a valid image format. The file may be corrupted or renamed."
}
```

**متى يحدث:** الملف ادّعى أنه صورة لكن محتواه مختلف (ملف مُعاد تسميته)

**الإجراء في الـ UI:**
- اعرض رسالة: "الملف تالف أو ليس صورة صالحة. يرجى المحاولة بصورة أخرى"

### 4. ⭐ خطأ ليست صورة نبات (`422`) — **الأهم**

```json
{
  "message": "This does not appear to be a plant image. Reason: The image shows a cat, not a plant"
}
```

**متى يحدث:** الصورة صالحة لكنها ليست صورة نبات

**الإجراء في الـ UI:**
- اعرض رسالة واضحة ومميزة: "هذه ليست صورة نبات. يرجى تصوير النبات المُصاب"
- يُفضل عرض أيقونة أو رسم يوضح نوع الصور المطلوبة
- يمكن استخدام الـ `Reason` من الرسالة لعرض تفاصيل إضافية

## كيفية التعامل مع الأخطاء (مثال كود)

### Flutter / Dart
```dart
final response = await dio.post('/api/scans', data: formData);

// في الـ error handler:
if (error.response?.statusCode == 400) {
  final message = error.response?.data['message'] ?? '';
  if (message.contains('Unsupported file type')) {
    showError('الرجاء رفع صورة بصيغة JPEG أو PNG فقط');
  } else if (message.contains('File too large')) {
    showError('حجم الصورة كبير جداً. الحد الأقصى 10 ميجابايت');
  } else if (message.contains('does not match a valid image')) {
    showError('الملف تالف. يرجى المحاولة بصورة أخرى');
  } else {
    showError(message);
  }
} else if (error.response?.statusCode == 422) {
  final message = error.response?.data['message'] ?? '';
  if (message.contains('does not appear to be a plant')) {
    showPlantValidationError('هذه ليست صورة نبات. يرجى تصوير النبات المُصاب');
  }
}
```

### React Native / JavaScript
```javascript
try {
  const response = await api.post('/api/scans', formData);
  // success...
} catch (error) {
  const status = error.response?.status;
  const message = error.response?.data?.message || '';

  if (status === 400) {
    if (message.includes('Unsupported file type')) {
      Alert.alert('خطأ', 'الرجاء رفع صورة بصيغة JPEG أو PNG فقط');
    } else if (message.includes('File too large')) {
      Alert.alert('خطأ', 'حجم الصورة كبير جداً. الحد الأقصى 10 ميجابايت');
    } else if (message.includes('does not match a valid image')) {
      Alert.alert('خطأ', 'الملف تالف. يرجى المحاولة بصورة أخرى');
    }
  } else if (status === 422) {
    if (message.includes('does not appear to be a plant')) {
      showPlantValidationScreen(); // شاشة خاصة أو dialog مميز
    }
  }
}
```

## التحقق من جهة الكلاينت (Client-Side Validation) — مستحسن

لتحسين تجربة المستخدم، يُفضل عمل تحقق أولي قبل إرسال الصورة:

```javascript
// قبل إرسال الصورة للسيرفر
function validateImageBeforeUpload(file) {
  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
  const MAX_SIZE_MB = 10;

  if (!ALLOWED_TYPES.includes(file.type)) {
    return { valid: false, error: 'الرجاء اختيار صورة بصيغة JPEG أو PNG أو WebP' };
  }

  if (file.size > MAX_SIZE_MB * 1024 * 1024) {
    return { valid: false, error: `حجم الصورة (${(file.size / 1024 / 1024).toFixed(1)} MB) أكبر من الحد المسموح (${MAX_SIZE_MB} MB)` };
  }

  return { valid: true };
}
```

## ملخص Error Codes

| Status Code | الحالة | الرسالة (تحتوي على) | الإجراء في الـ UI |
|-------------|--------|---------------------|-------------------|
| `400` | نوع ملف خاطئ | `Unsupported file type` | اعرض رسالة + فتح file picker بأنواع محددة |
| `400` | حجم كبير | `File too large` | اعرض رسالة + اقتراح ضغط الصورة |
| `400` | ملف فاسد | `does not match a valid image` | اعرض رسالة + اطلب صورة أخرى |
| `422` | ليست نبات | `does not appear to be a plant` | 🌟 اعرض شاشة/dialog خاص بصور النبات |
| `400` | لا يوجد صورة | `No image file provided` | (موجود من قبل) |
| `500` | خطأ سيرفر | `Failed to analyze` | (موجود من قبل) |

---

# 🖥️ القسم الثاني: لوحة الأدمن (Admin Dashboard)

## ما الذي تغير في الـ API؟

### GET `/api/admin/scan-detection` — حقول جديدة في الـ Response

الـ Response الآن يتضمن كائن `imageValidation` جديد:

```json
{
  "message": "Scan detection settings retrieved",
  "data": {
    "mode": "hybrid",
    "plantModel": {
      "enabled": true,
      "url": "https://mahmoudtharwat-plant-disease-api.hf.space",
      "confidenceThreshold": 0.75,
      "diseaseConfidenceThreshold": 0.7,
      "alwaysAttempt": true,
      "supportedPlants": []
    },
    "gemini": {
      "enabled": true,
      "model": "gemini-2.5-flash"
    },
    "imageValidation": {
      "enabled": true,
      "confidenceThreshold": 0.7
    },
    "availableModes": { "..." : "..." },
    "description": "..."
  }
}
```

### PUT `/api/admin/scan-detection` — حقول جديدة في الـ Request

يمكن إرسال حقلين جديدين:

```json
{
  "mode": "hybrid",
  "imageValidationEnabled": true,
  "plantCheckConfidenceThreshold": 0.7
}
```

| الحقل | النوع | مطلوب | القيمة الافتراضية | الوصف |
|-------|-------|--------|-------------------|-------|
| `imageValidationEnabled` | `boolean` | ❌ | `true` | تفعيل/تعطيل نظام التحقق من الصور |
| `plantCheckConfidenceThreshold` | `number` | ❌ | `0.7` | حد الثقة (0.0 - 1.0) — كلما زاد الرقم، كلما كان التحقق أكثر صرامة |

## التغييرات المطلوبة في واجهة الأدمن

### في صفحة "إعدادات التشخيص" (Scan Detection Settings)

أضف قسم جديد بعنوان **"التحقق من الصور"** أو **"Image Validation"** يحتوي على:

#### 1. Toggle Switch — تفعيل/تعطيل التحقق

```
[🔘 مفعّل] التحقق من الصور قبل التشخيص
```

- **الحقل في الـ API:** `imageValidationEnabled`
- **القيمة من الـ GET:** `data.imageValidation.enabled`
- **التأثير:** عند التعطيل، كل الصور تُقبل بدون تحقق

#### 2. Slider / Input — حد الثقة

```
حد ثقة تصنيف النبات: [====●======] 0.7
```

- **الحقل في الـ API:** `plantCheckConfidenceThreshold`
- **القيمة من الـ GET:** `data.imageValidation.confidenceThreshold`
- **النطاق:** 0.0 إلى 1.0
- **شرح للأدمن:**
  - `0.5` = متساهل — يقبل صور غير واضحة
  - `0.7` = متوازن (القيمة الافتراضية)
  - `0.9` = صارم — يرفض الصور المشكوك فيها

#### 3. توضيح للأدمن (Info Box)

اعرض رسالة توضيحية:

> **ماذا يفعل التحقق من الصور؟**
> عند التفعيل، يتم فحص كل صورة مرفوعة من المستخدم للتأكد من أنها صورة نبات قبل بدء التشخيص.
> الصور غير النباتية (حيوانات، أشخاص، أشياء) تُرفض فوراً مما يوفر تكلفة API والوقت.

## مثال كود — React Admin Dashboard

```jsx
// في صفحة إعدادات التشخيص
const ScanDetectionSettings = () => {
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    // جلب الإعدادات
    api.get('/api/admin/scan-detection').then(res => {
      setSettings(res.data.data);
    });
  }, []);

  const handleUpdate = async (updates) => {
    await api.put('/api/admin/scan-detection', {
      mode: settings.mode, // mode مطلوب دائماً
      ...updates,
    });
    // إعادة جلب الإعدادات
  };

  return (
    <div>
      {/* ... الإعدادات الحالية (mode, plantModel, gemini) ... */}

      {/* ===== القسم الجديد ===== */}
      <Section title="التحقق من الصور (Image Validation)">
        <ToggleSwitch
          label="تفعيل التحقق من الصور قبل التشخيص"
          checked={settings?.imageValidation?.enabled}
          onChange={(checked) => handleUpdate({
            imageValidationEnabled: checked
          })}
        />

        {settings?.imageValidation?.enabled && (
          <Slider
            label="حد ثقة تصنيف النبات"
            min={0}
            max={1}
            step={0.05}
            value={settings?.imageValidation?.confidenceThreshold}
            onChange={(value) => handleUpdate({
              plantCheckConfidenceThreshold: value
            })}
            helperText="0.5 = متساهل | 0.7 = متوازن | 0.9 = صارم"
          />
        )}

        <InfoBox>
          عند التفعيل، يتم فحص كل صورة مرفوعة للتأكد من أنها صورة نبات.
          الصور غير النباتية تُرفض فوراً لتوفير التكلفة والوقت.
        </InfoBox>
      </Section>
    </div>
  );
};
```

## مثال كود — Flutter Admin

```dart
// في صفحة إعدادات التشخيص
class ScanDetectionSettingsPage extends StatefulWidget {
  // ...
}

class _ScanDetectionSettingsPageState extends State<ScanDetectionSettingsPage> {
  Map<String, dynamic>? settings;

  Future<void> _loadSettings() async {
    final response = await adminApi.get('/api/admin/scan-detection');
    setState(() {
      settings = response.data['data'];
    });
  }

  Future<void> _updateSettings(Map<String, dynamic> updates) async {
    await adminApi.put('/api/admin/scan-detection', data: {
      'mode': settings!['mode'], // mode مطلوب دائماً
      ...updates,
    });
    await _loadSettings(); // إعادة جلب الإعدادات
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        // ... الإعدادات الحالية ...

        // ===== القسم الجديد =====
        SectionHeader('التحقق من الصور'),

        SwitchListTile(
          title: Text('تفعيل التحقق من الصور'),
          subtitle: Text('رفض الصور غير النباتية تلقائياً'),
          value: settings?['imageValidation']?['enabled'] ?? true,
          onChanged: (value) => _updateSettings({
            'imageValidationEnabled': value,
          }),
        ),

        if (settings?['imageValidation']?['enabled'] == true)
          SliderListTile(
            title: 'حد ثقة تصنيف النبات',
            min: 0.0,
            max: 1.0,
            divisions: 20,
            value: settings?['imageValidation']?['confidenceThreshold'] ?? 0.7,
            onChanged: (value) => _updateSettings({
              'plantCheckConfidenceThreshold': value,
            }),
            subtitle: '0.5 = متساهل | 0.7 = متوازن | 0.9 = صارم',
          ),
      ],
    );
  }
}
```

---

# 📋 ملخص شامل للتغييرات

## تطبيق المستخدم (مطلوب 🔴)

- [ ] التعامل مع HTTP `400` — رسائل أخطاء الملف (نوع، حجم، فاسد)
- [ ] التعامل مع HTTP `422` — رسالة "ليست صورة نبات" بشاشة/dialog مميز
- [ ] (مستحسن) إضافة client-side validation قبل الإرسال (نوع + حجم)
- [ ] (مستحسن) تقييد file picker للسماح بـ JPEG/PNG/WebP فقط

## لوحة الأدمن (مستحسن 🟡)

- [ ] إضافة قسم "التحقق من الصور" في صفحة إعدادات التشخيص
- [ ] Toggle لتفعيل/تعطيل التحقق (`imageValidationEnabled`)
- [ ] Slider لحد الثقة (`plantCheckConfidenceThreshold`)
- [ ] عرض الحالة الحالية من `data.imageValidation`

## لا يوجد تغييرات في:
- ✅ شكل response لـ `POST /api/scans` في حالة النجاح (نفس البنية)
- ✅ شكل response لـ `GET /api/scans` و `GET /api/scans/:id`
- ✅ الـ Authentication — نفس النظام
- ✅ الـ endpoints الأخرى — لم تتغير
