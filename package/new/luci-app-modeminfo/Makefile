#
# Copyright (C) 2023-2026 DotyWrt
#
# This is free software, licensed under the Apache License, Version 3.0 .
#

include $(TOPDIR)/rules.mk

PKG_NAME:=luci-app-modeminfo
PKG_VERSION:=2.1
PKG_RELEASE:=1

PKG_LICENSE:=GPL-3.0
PKG_MAINTAINER:=dotycat <support@dotycat.com>

include $(TOPDIR)/feeds/luci/luci.mk

LUCI_TITLE:=LuCI Modem Info
LUCI_DESCRIPTION:=Modern modem information and signal monitoring for OpenWrt
LUCI_DEPENDS:=+sms-tool +kmod-usb-serial-option

PKG_ARCH:=all

$(eval $(call BuildPackage,$(PKG_NAME)))
