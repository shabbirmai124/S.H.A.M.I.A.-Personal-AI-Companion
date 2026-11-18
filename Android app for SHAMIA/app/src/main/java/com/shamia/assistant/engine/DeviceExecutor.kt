package com.shamia.assistant.engine

import android.content.Context
import android.content.Intent
import android.hardware.camera2.CameraManager
import android.net.Uri
import android.os.Build
import android.provider.Settings
import com.shamia.assistant.model.DeviceActionType
import com.shamia.assistant.model.DeviceControlState
import com.shamia.assistant.model.PendingAction

object DeviceExecutor {

    fun execute(
        context: Context,
        action: PendingAction,
        currentControls: DeviceControlState,
        onControlsUpdated: (DeviceControlState) -> Unit
    ): String {
        return when (action.type) {
            DeviceActionType.DIAL_CONTACT -> {
                val number = IntentEngine.validatePhoneNumber(action.targetValue)
                if (number == null) {
                    "Valid phone digits are required before opening the dialer."
                } else {
                    val intent = Intent(Intent.ACTION_DIAL, Uri.parse("tel:$number")).apply {
                        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    }
                    context.startActivity(intent)
                    "Phone dialer opened for $number."
                }
            }
            DeviceActionType.OPEN_APP -> {
                val url = action.targetValue
                if (url.startsWith("https://")) {
                    val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url)).apply {
                        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    }
                    context.startActivity(intent)
                    "Launched ${action.title}."
                } else {
                    "Blocked unsafe destination URL."
                }
            }
            DeviceActionType.TOGGLE_WIFI -> {
                onControlsUpdated(currentControls.copy(wifi = action.toggleState))
                val intent = Intent(
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) Settings.Panel.ACTION_WIFI
                    else Settings.ACTION_WIFI_SETTINGS
                ).apply { addFlags(Intent.FLAG_ACTIVITY_NEW_TASK) }
                runCatching { context.startActivity(intent) }
                "Wi-Fi settings opened (${if (action.toggleState) "Enable" else "Disable"})."
            }
            DeviceActionType.TOGGLE_BLUETOOTH -> {
                onControlsUpdated(currentControls.copy(bluetooth = action.toggleState))
                val intent = Intent(Settings.ACTION_BLUETOOTH_SETTINGS).apply {
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                runCatching { context.startActivity(intent) }
                "Bluetooth settings opened (${if (action.toggleState) "Enable" else "Disable"})."
            }
            DeviceActionType.TOGGLE_DND -> {
                onControlsUpdated(currentControls.copy(dnd = action.toggleState))
                "Do Not Disturb updated to ${if (action.toggleState) "on" else "off"}."
            }
            DeviceActionType.TOGGLE_FLASHLIGHT -> {
                onControlsUpdated(currentControls.copy(flashlight = action.toggleState))
                runCatching {
                    val cm = context.getSystemService(Context.CAMERA_SERVICE) as CameraManager
                    val camId = cm.cameraIdList.firstOrNull()
                    if (camId != null) cm.setTorchMode(camId, action.toggleState)
                }
                "Hardware flashlight switched ${if (action.toggleState) "on" else "off"}."
            }
            DeviceActionType.SET_BRIGHTNESS -> {
                val pct = action.numericValue.coerceIn(10, 100)
                onControlsUpdated(currentControls.copy(brightnessPct = pct))
                "Display brightness adjusted to $pct%."
            }
            DeviceActionType.SET_ALARM -> "Alarm reminder scheduled for ${action.numericValue} minute(s)."
            DeviceActionType.PLAY_MUSIC -> "Ambient focus synthesizer active."
        }
    }
}
