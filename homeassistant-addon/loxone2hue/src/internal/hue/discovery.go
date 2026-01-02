package hue

import (
	"context"
	"time"

	"github.com/grandcat/zeroconf"
	"github.com/rs/zerolog/log"
)

// BridgeInfo represents discovered HUE bridge information
type BridgeInfo struct {
	ID   string `json:"id"`
	IP   string `json:"ip"`
	Name string `json:"name"`
}

// DiscoverBridges uses mDNS to discover HUE bridges on the network
func DiscoverBridges(timeout time.Duration) ([]BridgeInfo, error) {
	resolver, err := zeroconf.NewResolver(nil)
	if err != nil {
		return nil, err
	}

	entries := make(chan *zeroconf.ServiceEntry)
	bridges := make([]BridgeInfo, 0)

	ctx, cancel := context.WithTimeout(context.Background(), timeout)
	defer cancel()

	go func() {
		for entry := range entries {
			if len(entry.AddrIPv4) > 0 {
				bridge := BridgeInfo{
					ID:   entry.Instance,
					IP:   entry.AddrIPv4[0].String(),
					Name: entry.Instance,
				}
				bridges = append(bridges, bridge)
				log.Info().
					Str("id", bridge.ID).
					Str("ip", bridge.IP).
					Msg("Discovered HUE bridge")
			}
		}
	}()

	// Look for HUE bridges using mDNS
	err = resolver.Browse(ctx, "_hue._tcp", "local.", entries)
	if err != nil {
		return nil, err
	}

	<-ctx.Done()

	return bridges, nil
}

// DiscoverFirstBridge discovers and returns the first HUE bridge found
func DiscoverFirstBridge(timeout time.Duration) (*BridgeInfo, error) {
	bridges, err := DiscoverBridges(timeout)
	if err != nil {
		return nil, err
	}

	if len(bridges) == 0 {
		return nil, nil
	}

	return &bridges[0], nil
}
