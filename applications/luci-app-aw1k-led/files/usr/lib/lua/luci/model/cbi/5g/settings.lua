m = Map("5g-led", translate("LED Settings"))

m.description = translate("Enable or disable specific LED indicators for different system states.")

s = m:section(NamedSection, "station", "led_control", translate("LED Enable/Disable"))
s.anonymous = true
s.addremove = false

local info = s:option(DummyValue, "_led_info", "")
info.rawhtml = true


local power = s:option(Flag, "enable_power", translate("Power LED"))
power.rmempty = false
power.description = translate("Control the front panel power LED.")

local g5 = s:option(Flag, "enable_5g", translate("5G LED"))
g5.rmempty = false
g5.description = translate("Show or hide the 5G network indicator LED.")

local mobile = s:option(Flag, "enable_mobile_signal", translate("Mobile Signal LED"))
mobile.rmempty = false
mobile.description = translate("Enable the LED used for mobile signal indication.")

local wifi = s:option(Flag, "enable_wifi", translate("WiFi LED"))
wifi.rmempty = false
wifi.description = translate("Turn the WiFi status LED on or off.")

local internet = s:option(Flag, "enable_internet", translate("Internet LED"))
internet.rmempty = false
internet.description = translate("Show internet connection status using the LED.")

local phone = s:option(Flag, "enable_phone", translate("Phone LED"))
phone.rmempty = false
phone.description = translate("Enable the phone or voice service indicator LED.")

return m
