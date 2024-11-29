import axios, { AxiosRequestConfig, AxiosResponse } from "axios";

export type Response<T> =
  | {
      data: T;
      success: true;
      errorCode?: string;
      errorMessage?: string;
    }
  | {
      data?: T;
      success: false;
      errorCode: number;
      errorMessage: string;
    };

type ExtractKeys<T extends string> =
  T extends `${string}{${infer Key}}${infer Rest}`
    ? Key | ExtractKeys<Rest>
    : never;

type PathVariables<T extends string> = ExtractKeys<T> extends never
  ? Record<string, string | number>
  : Record<ExtractKeys<T>, string | number>;

type RequestConfig<
  D extends object,
  Q extends object,
  U extends string,
  P = PathVariables<U>
> = Omit<AxiosRequestConfig<D>, "url" | "params"> & {
  /**
   * @example '/api/:id' => pathVariables: { id: "1" }
   * @example '/api/:id/:name' => pathVariables: { id: "1", name: "2" }
   */
  url: U;
  ignoreAuth?: boolean; //不為true時 header需附帶Authentication value為token
  silentError?: boolean;
  throwError?: boolean;
  params?: Q;
  /**
   * @example '/api/:id' => { id: "1" }
   * @example '/api/:id/:name' => { id: "1", name: "2" }
   */
  pathVariables?: P;
};

export interface Request {
  <
    T,
    D extends object = any,
    Q extends object = any,
    U extends string = string,
    P = PathVariables<U>
  >(
    args: RequestConfig<D, Q, U, P>
  ): Promise<Response<T>>;
}

type RequestError = {
  errorCode: number,
  errorMessage: string,
  // 是业务错误
  isBusiness: boolean
}

type ErrorHandle = {
  [key: string]: Function
}


/**
 * 业务错误
 * 不同的错误码做不同的处理
 */
const businessErrorCode: ErrorHandle = {
  10: (msg: string) => {
    // 这里可以只用不同的 UI 框架
    $message.error(msg || '发生错误')
  },
  20: () => {

  }
}


/**
 * http请求错误
 * 不同的错误码做不同的处理
 */
const httpErrorCode: ErrorHandle = {
  403: (msg: string) => {
    // 这里可以只用不同的 UI 框架
    $message.error(msg || '没有权限')
  },
  404: () => {

  }
}



// 这里根据项目具体情况配置
const baseURL = 'http://localhost:3000'

const axiosInstance = axios.create({
  baseURL
})

axiosInstance.interceptors.request.use(
  config => {
    /**
     * 根据项目需求定制请求拦截器，如 request header 等 
     */
    return config
  }
)

axiosInstance.interceptors.response.use(
  response => {
    const {code, msg} = response.data
    if (code === 0) {
      return response
    }
    return Promise.reject({
      isBusiness: true,
      errorCode: code,
      errorMessage: msg
    })
  },
  error => {
    return Promise.reject({
      ...error,
      isBusiness: false
    })
  }
)

// 有些我没有具体的实现，但是具体的结构和思路有写
const request: Request = async <
  T = any,
  D extends object = any,
  Q extends object = any,
  U extends string = string,
  P = PathVariables<U>
>(
  args: RequestConfig<D, Q, U, P>
) => {

  try {

    const axiosResponse: AxiosResponse<T> = await axiosInstance<T>(args);
    return Promise.resolve({
      success: true,
      data: axiosResponse.data
    });

  } catch(error) {
    const {errorCode, errorMessage, isBusiness} = error as RequestError;

    if (args.throwError) {
      isBusiness ? 
        businessErrorCode[errorCode]?.(errorMessage) : 
        httpErrorCode[errorCode]?.(errorMessage)
    }
    return Promise.reject({
      success: false,
      errorCode,
      errorMessage
    });
  }
};

export default request;
