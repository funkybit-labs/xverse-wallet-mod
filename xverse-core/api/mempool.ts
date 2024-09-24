import axios from 'axios';
import { NetworkType, RecommendedFeeResponse } from '../types';

const networkRouteMap = {
  Mainnet: '',
  Testnet: 'testnet/',
  Signet: 'signet/',
};

const getRecommendedFees = async (network: NetworkType): Promise<RecommendedFeeResponse> => {
  const { data } = await axios.get<RecommendedFeeResponse>(
    network === 'Signet' ? 'https://mempool.dev.aws.archnetwork.xyz/api/v1/fees/recommended' : `https://mempool.space/${networkRouteMap[network]}api/v1/fees/recommended`,
  );
  return data;
};

export default {
  getRecommendedFees,
};
