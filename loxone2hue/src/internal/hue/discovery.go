package hue

import (
	"context"
	"fmt"
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

	ctx, cancel := context.WithTimeout(context.Background(), timeout)
	defer cancel()

	// The collector owns the slice and hands it over when the resolver closes
	// the channel. Appending from the goroutine while the caller returned the
	// same slice was a data race.
	results := make(chan []BridgeInfo, 1)

	go func() {
		bridges := make([]BridgeInfo, 0)
		seen := make(map[string]bool)

		for entry := range entries {
			if len(entry.AddrIPv4) == 0 {
				continue
			}

			bridge := BridgeInfo{
				ID:   entry.Instance,
				IP:   entry.AddrIPv4[0].String(),
				Name: entry.Instance,
			}

			// The same bridge is announced once per interface.
			if seen[bridge.IP] {
				continue
			}
			seen[bridge.IP] = true

			bridges = append(bridges, bridge)
			log.Info().
				Str("id", bridge.ID).
				Str("ip", bridge.IP).
				Msg("Discovered HUE bridge")
		}

		results <- bridges
	}()

	// Look for HUE bridges using mDNS
	err = resolver.Browse(ctx, "_hue._tcp", "local.", entries)
	if err != nil {
		return nil, err
	}

	<-ctx.Done()

	select {
	case bridges := <-results:
		return bridges, nil
	case <-time.After(2 * time.Second):
		// The resolver should close entries once the context is done. Do not
		// hang an API request on it if it does not.
		return nil, fmt.Errorf("bridge discovery did not finish")
	}
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
