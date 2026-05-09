#
# Copyright (C) 2023-2026 DotyWrt
#
# This is free software, licensed under the Apache License, Version 3.0 .
#

include $(TOPDIR)/rules.mk

PKG_NAME:=luci-app-nft-ttl
PKG_VERSION:=1.0
PKG_RELEASE:=2

PKG_LICENSE:=GPL-3.0
PKG_MAINTAINER:=dotycat <support@dotycat.com>

include $(TOPDIR)/feeds/luci/luci.mk

LUCI_TITLE:=TTL Changer
LUCI_DESCRIPTION:=LuCI interface for changing TTL using nftables
LUCI_DEPENDS:=+luci +nftables

PKG_ARCH:=all

$(eval $(call BuildPackage,$(PKG_NAME)))