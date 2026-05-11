#
# Copyright (C) 2023-2026 DotyWrt
#
# This is free software, licensed under the Apache License, Version 3.0 .
#

include $(TOPDIR)/rules.mk

PKG_NAME:=luci-app-netstat
PKG_VERSION:=1.2
PKG_RELEASE:=8

PKG_LICENSE:=GPL-3.0
PKG_MAINTAINER:=dotycat <support@dotycat.com>

include $(TOPDIR)/feeds/luci/luci.mk

LUCI_TITLE:=LuCI NetStat
LUCI_DESCRIPTION:=Net statistics and monitoring for OpenWrt
LUCI_DEPENDS:=+vnstat +curl +luci-app-filemanager

PKG_ARCH:=all

$(eval $(call BuildPackage,$(PKG_NAME)))