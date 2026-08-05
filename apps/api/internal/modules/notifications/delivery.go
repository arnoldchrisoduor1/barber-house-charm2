package notifications

// DeliveryAware reports whether messages leave the process (live provider) vs dry-run/log only.
type DeliveryAware interface {
	DeliversExternally() bool
}

func DeliversExternally(n Notifier) bool {
	if n == nil {
		return false
	}
	if m, ok := n.(*MultiNotifier); ok {
		return m.DeliversExternally()
	}
	if d, ok := n.(DeliveryAware); ok {
		return d.DeliversExternally()
	}
	return true
}
