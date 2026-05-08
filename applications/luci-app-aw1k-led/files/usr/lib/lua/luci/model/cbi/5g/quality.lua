m = Map("5g-led", translate("5G Signal Quality"))

m.description = translate("Configure LED behavior for Bad 5G signal.")

s = m:section(NamedSection, "signal", "quality", translate("Signal Quality Thresholds"))
s.anonymous = true
s.addremove = false

local qualities = {
	{ id = "excellent", label = translate("Excellent") },
	{ id = "good",      label = translate("Good") },
	{ id = "average",   label = translate("Average") },
	{ id = "bad",       label = translate("Bad") }
}

for _, q in ipairs(qualities) do
	s:tab(q.id, q.label)

	local snr = s:taboption(q.id, Value, q.id .. "_min_snr", translate("Minimum SNR"))
	snr.datatype = "uinteger"
	snr.placeholder = "0"
	snr.rmempty = false

	local color = s:taboption(q.id, ListValue, q.id .. "_color", translate("LED Color"))
	color:value("green",  translate("Green"))
	color:value("blue",   translate("Blue"))
	color:value("red",    translate("Red"))
	color:value("yellow", translate("Yellow"))
	color:value("purple", translate("Purple"))
	color.rmempty = false

	local blink = s:taboption(q.id, Flag, q.id .. "_blink", translate("Blink LED"))
	blink.default = blink.disabled
	blink.rmempty = false
end

return m
