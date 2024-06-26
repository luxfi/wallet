import { NetworkConfig } from '@/Network/types';
import { LocalnetConfig, MainnetConfig, TestnetConfig } from '@/Network/constants';
import { activeNetwork } from '@/Network/network';

export function isTestnetNetwork(activeNetwork: NetworkConfig) {
    return activeNetwork.networkID === TestnetConfig.networkID;
}

export function isTestnetNetworkId(id: number) {
    return id === TestnetConfig.networkID;
}

export function isMainnetNetwork(activeNetwork: NetworkConfig) {
    return activeNetwork.networkID === MainnetConfig.networkID;
}

export function isMainnetNetworkId(id: number) {
    return id === MainnetConfig.networkID;
}

export function isLocalNetwork(activeNetwork: NetworkConfig) {
    return activeNetwork.networkID === LocalnetConfig.networkID;
}

export function getLuxAssetID() {
    return activeNetwork.luxID;
}

export function getActiveNetworkConfig() {
    return activeNetwork;
}
